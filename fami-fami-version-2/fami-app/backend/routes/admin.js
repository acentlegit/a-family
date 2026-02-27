const express = require('express');
const router = express.Router();
const Family = require('../models/Family');
const Member = require('../models/Member');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const QRCode = require('qrcode');

// @route   GET /api/admin/families/:familyId/members
// @desc    Get all members for admin management
// @access  Private (Admin only)
router.get('/families/:familyId/members', protect, async (req, res) => {
  try {
    const family = await Family.findById(req.params.familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is admin
    const member = family.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Get all members with user details
    const members = await Promise.all(
      family.members.map(async (m) => {
        const user = await User.findById(m.user).select('firstName lastName email avatar');
        return {
          id: m._id,
          user: user,
          role: m.role,
          relationship: m.relationship,
          joinedAt: m.joinedAt
        };
      })
    );

    res.json({ success: true, members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/families/:familyId/members/:memberId
// @desc    Update member role
// @access  Private (Admin only)
router.put('/families/:familyId/members/:memberId', protect, async (req, res) => {
  try {
    const { role } = req.body;
    const family = await Family.findById(req.params.familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is admin
    const adminMember = family.members.find(m => m.user.toString() === req.user._id.toString());
    if (!adminMember || adminMember.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Update member role
    const member = family.members.id(req.params.memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (role && ['Admin', 'Member', 'Guest'].includes(role)) {
      member.role = role;
      await family.save();
    }

    res.json({ success: true, message: 'Member role updated' });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/admin/families/:familyId/members/:memberId
// @desc    Remove member from family
// @access  Private (Admin only)
router.delete('/families/:familyId/members/:memberId', protect, async (req, res) => {
  try {
    const family = await Family.findById(req.params.familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is admin
    const adminMember = family.members.find(m => m.user.toString() === req.user._id.toString());
    if (!adminMember || adminMember.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Remove member
    family.members.pull(req.params.memberId);
    await family.save();

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/families/:familyId/invite-qr
// @desc    Generate QR code for family invitation
// @access  Private (Admin only)
router.get('/families/:familyId/invite-qr', protect, async (req, res) => {
  try {
    const family = await Family.findById(req.params.familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is admin
    const member = family.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const getClientUrl = require('../utils/getClientUrl');
    const clientUrl = getClientUrl();
    const inviteUrl = `${clientUrl}/invite/${family.passcode}`;
    const qrCode = await QRCode.toDataURL(inviteUrl);

    res.json({ success: true, qrCode, inviteUrl });
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/families/:familyId/send-email
// @desc    Send email to all family members
// @access  Private (Admin only)
router.post('/families/:familyId/send-email', protect, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const family = await Family.findById(req.params.familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is admin
    const member = family.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Get all member emails
    const userIds = family.members.map(m => m.user);
    const users = await User.find({ _id: { $in: userIds } }).select('email firstName lastName');
    const emails = users.map(u => u.email).filter(email => email && email.includes('@'));

    // Send email to all members
    const { sendBulkEmail } = require('../utils/email');
    if (emails.length > 0) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #667eea;">Message from ${family.name}</h2>
          <p>${message}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated message from Fami Family Management App.</p>
        </div>
      `;
      await sendBulkEmail(emails, subject || `Message from ${family.name}`, emailHtml);
    }

    res.json({ success: true, message: `Email sent to ${emails.length} members` });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
