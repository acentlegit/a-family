const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Family = require('../models/Family');
const Member = require('../models/Member');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../utils/cloudinary');

// @route   GET /api/events/:familyId
// @desc    Get all events for a family
// @access  Private
router.get('/:familyId', protect, async (req, res) => {
  try {
    const events = await Event.find({ family: req.params.familyId })
      .populate('createdBy', 'firstName lastName avatar')
      .populate('attendees.user', 'firstName lastName avatar')
      .sort('startDate');

    res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/events/single/:id
// @desc    Get single event
// @access  Private
router.get('/single/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'firstName lastName avatar')
      .populate('attendees.user', 'firstName lastName avatar');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/events/:familyId
// @desc    Create new event
// @access  Private
router.post('/:familyId', protect, async (req, res) => {
  try {
    const { title, description, eventType, startDate, endDate, location, isVirtual, virtualLink } = req.body;

    const event = await Event.create({
      family: req.params.familyId,
      title,
      description,
      eventType,
      startDate,
      endDate,
      location,
      isVirtual: isVirtual === 'true' || isVirtual === true,
      meetingLink: virtualLink || '',
      createdBy: req.user._id
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('createdBy', 'firstName lastName avatar');

    // Get family details for email notification
    const family = await Family.findById(req.params.familyId);
    
    // Get all family members' emails for notification
    const familyMembers = await Member.find({ family: req.params.familyId }).select('email firstName lastName');
    const familyUsers = await User.find({ _id: { $in: family.members.map(m => m.user) } }).select('email firstName lastName');
    
    // Collect all email addresses
    const notificationEmails = [];
    familyMembers.forEach(m => {
      if (m.email && m.email.includes('@')) {
        notificationEmails.push(m.email);
      }
    });
    familyUsers.forEach(u => {
      if (u.email && u.email.includes('@') && !notificationEmails.includes(u.email)) {
        notificationEmails.push(u.email);
      }
    });

    // Send email notification to family members
    if (notificationEmails.length > 0) {
      const { sendBulkEmail } = require('../utils/email');
      const createdByName = populatedEvent.createdBy ? `${populatedEvent.createdBy.firstName} ${populatedEvent.createdBy.lastName || ''}`.trim() : 'Someone';
      const eventDate = startDate ? new Date(startDate).toLocaleString() : 'TBD';
      
      const emailSubject = `New Family Event: ${title}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #667eea;">📅 New Family Event Created</h2>
          <p>Hello,</p>
          <p><strong>${createdByName}</strong> has created a new event for the <strong>${family.name}</strong> family:</p>
          <div style="background: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Event:</strong> ${title}</p>
            ${description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${description}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDate}</p>
            ${location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${location}</p>` : ''}
            ${eventType ? `<p style="margin: 5px 0;"><strong>Type:</strong> ${eventType}</p>` : ''}
            ${isVirtual === 'true' || isVirtual === true ? `<p style="margin: 5px 0;"><strong>Virtual Link:</strong> ${virtualLink || 'TBD'}</p>` : ''}
          </div>
          <p style="color: #666; font-size: 14px;">You can view and RSVP to this event in your Fami app.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated notification from Fami Family Management App.</p>
        </div>
      `;
      
      sendBulkEmail(notificationEmails, emailSubject, emailHtml).catch(err => {
        console.error('Error sending event email:', err);
      });
    }

    // Emit socket event for real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.familyId).emit('new-event', populatedEvent);
    }

    res.status(201).json({ success: true, data: populatedEvent });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, description, eventType, startDate, endDate, location, isVirtual, virtualLink } = req.body;
    const updateData = { 
      title, 
      description, 
      eventType, 
      startDate, 
      endDate, 
      location, 
      isVirtual: isVirtual === 'true' || isVirtual === true, 
      meetingLink: virtualLink || '' 
    };

    event = await Event.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('createdBy', 'firstName lastName avatar')
      .populate('attendees.user', 'firstName lastName avatar');

    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await event.deleteOne();

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/events/:id/rsvp
// @desc    RSVP to event
// @access  Private
router.post('/:id/rsvp', protect, async (req, res) => {
  try {
    const { status } = req.body;
    console.log('RSVP request:', { eventId: req.params.id, userId: req.user._id, status });
    
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const attendeeIndex = event.attendees.findIndex(a => a.user.toString() === req.user._id.toString());

    if (attendeeIndex > -1) {
      event.attendees[attendeeIndex].status = status;
      event.attendees[attendeeIndex].respondedAt = new Date();
    } else {
      event.attendees.push({
        user: req.user._id,
        status,
        respondedAt: new Date()
      });
    }

    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('createdBy', 'firstName lastName avatar')
      .populate('attendees.user', 'firstName lastName avatar');

    console.log('RSVP updated successfully. Attendees count:', populatedEvent.attendees.length);
    res.json({ success: true, data: populatedEvent });
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
