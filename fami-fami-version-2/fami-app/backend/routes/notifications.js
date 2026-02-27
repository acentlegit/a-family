const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/email');
const getClientUrl = require('../utils/getClientUrl');
const User = require('../models/User');
const Family = require('../models/Family');
const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { limit = 20, unreadOnly = false } = req.query;
    
    const query = { user: req.user._id };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate('family', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    const unreadCount = await Notification.countDocuments({ 
      user: req.user._id, 
      read: false 
    });
    
    res.json({ 
      success: true, 
      data: notifications,
      unreadCount 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get count of unread notifications
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      user: req.user._id, 
      read: false 
    });
    
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/notifications/create
// @desc    Create a notification (internal use)
// @access  Private
router.post('/create', protect, async (req, res) => {
  try {
    const { userId, familyId, type, title, message, link, icon } = req.body;

    const notification = await Notification.create({
      user: userId || req.user._id,
      family: familyId,
      type,
      title,
      message,
      link,
      icon,
      createdBy: req.user._id
    });

    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/notifications/send-email
// @desc    Send notification email to family members
// @access  Private
router.post('/send-email', protect, async (req, res) => {
  try {
    const { familyId, subject, message, recipients } = req.body;

    if (!familyId || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Family ID, subject, and message are required' 
      });
    }

    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Get family members
    const Member = require('../models/Member');
    const members = await Member.find({ family: familyId });

    let emailsSent = 0;
    const errors = [];

    // Send email to each member with email address
    for (const member of members) {
      if (member.email && (!recipients || recipients.includes(member._id.toString()))) {
        try {
          await sendEmail({
            to: member.email,
            subject: `${family.name}: ${subject}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #2563EB 0%, #14B8A6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">${family.name}</h1>
                </div>
                
                <div style="background: #F8FAFC; padding: 30px; border-radius: 0 0 12px 12px;">
                  <h2 style="color: #1E293B; margin: 0 0 20px 0;">${subject}</h2>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #2563EB; margin-bottom: 20px;">
                    <p style="color: #475569; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #64748B; font-size: 14px; margin: 0;">
                      Sent from ${req.user.firstName} ${req.user.lastName}
                    </p>
                  </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                  <p style="color: #94A3B8; font-size: 12px; margin: 0;">
                    This is an automated message from your Family Management App
                  </p>
                </div>
              </div>
            `
          });
          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send email to ${member.email}:`, emailError);
          errors.push({ email: member.email, error: emailError.message });
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully sent ${emailsSent} emails`,
      emailsSent,
      totalMembers: members.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/notifications/send-event-reminder
// @desc    Send event reminder emails
// @access  Private
router.post('/send-event-reminder', protect, async (req, res) => {
  try {
    const { eventId } = req.body;

    const Event = require('../models/Event');
    const event = await Event.findById(eventId)
      .populate('family')
      .populate('attendees.user');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    let emailsSent = 0;
    const errors = [];

    // Send reminder to all attendees who are going or maybe
    for (const attendee of event.attendees) {
      if ((attendee.status === 'going' || attendee.status === 'maybe') && attendee.user.email) {
        try {
          const eventDate = new Date(event.startDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          await sendEmail({
            to: attendee.user.email,
            subject: `Reminder: ${event.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">📅 Event Reminder</h1>
                </div>
                
                <div style="background: #F8FAFC; padding: 30px; border-radius: 0 0 12px 12px;">
                  <h2 style="color: #1E293B; margin: 0 0 20px 0;">${event.title}</h2>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="color: #475569; margin: 0 0 15px 0;"><strong>📅 Date:</strong> ${eventDate}</p>
                    <p style="color: #475569; margin: 0 0 15px 0;"><strong>📍 Location:</strong> ${event.location}</p>
                    ${event.description ? `<p style="color: #475569; margin: 0;"><strong>Description:</strong> ${event.description}</p>` : ''}
                  </div>
                  
                  ${event.isVirtual && event.meetingLink ? `
                    <div style="text-align: center; margin: 20px 0;">
                      <a href="${event.meetingLink}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Join Virtual Meeting
                      </a>
                    </div>
                  ` : ''}
                  
                  <div style="background: #DBEAFE; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <p style="color: #1E40AF; margin: 0; font-size: 14px; text-align: center;">
                      Your RSVP: <strong>${attendee.status === 'going' ? '✅ Going' : '❓ Maybe'}</strong>
                    </p>
                  </div>
                </div>
              </div>
            `
          });
          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send reminder to ${attendee.user.email}:`, emailError);
          errors.push({ email: attendee.user.email, error: emailError.message });
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully sent ${emailsSent} reminders`,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/notifications/send-memory-notification
// @desc    Notify family members about new memory
// @access  Private
router.post('/send-memory-notification', protect, async (req, res) => {
  try {
    const { memoryId } = req.body;

    const Memory = require('../models/Memory');
    const Member = require('../models/Member');
    
    const memory = await Memory.findById(memoryId)
      .populate('family')
      .populate('createdBy');

    if (!memory) {
      return res.status(404).json({ success: false, message: 'Memory not found' });
    }

    // Get all family members
    const members = await Member.find({ family: memory.family._id });

    let emailsSent = 0;
    const errors = [];

    for (const member of members) {
      if (member.email && member._id.toString() !== req.user._id.toString()) {
        try {
          await sendEmail({
            to: member.email,
            subject: `New Memory Shared: ${memory.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">📸 New Memory Shared</h1>
                </div>
                
                <div style="background: #F8FAFC; padding: 30px; border-radius: 0 0 12px 12px;">
                  <h2 style="color: #1E293B; margin: 0 0 20px 0;">${memory.title}</h2>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="color: #475569; margin: 0 0 15px 0;">
                      <strong>${memory.createdBy.firstName} ${memory.createdBy.lastName}</strong> shared a new memory in <strong>${memory.family.name}</strong>
                    </p>
                    ${memory.description ? `<p style="color: #475569; margin: 0; font-style: italic;">"${memory.description}"</p>` : ''}
                  </div>
                  
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${getClientUrl()}/memories" style="display: inline-block; background: #EC4899; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                      View Memory
                    </a>
                  </div>
                </div>
              </div>
            `
          });
          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send notification to ${member.email}:`, emailError);
          errors.push({ email: member.email, error: emailError.message });
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully sent ${emailsSent} notifications`,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Send memory notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
