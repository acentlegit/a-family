const express = require('express');
const router = express.Router();
const Invitation = require('../models/Invitation');
const Family = require('../models/Family');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/email');
const { v4: uuidv4 } = require('uuid');

// @route   GET /api/invitations/:familyId
// @desc    Get all invitations for a family
// @access  Private
router.get('/:familyId', protect, async (req, res) => {
  try {
    const invitations = await Invitation.find({ family: req.params.familyId })
      .populate('invitedBy', 'firstName lastName email')
      .sort('-createdAt');

    res.json({ success: true, count: invitations.length, data: invitations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/invitations/:familyId
// @desc    Send invitation
// @access  Private
router.post('/:familyId', protect, async (req, res) => {
  try {
    const { email, role, relationship } = req.body;

    const family = await Family.findById(req.params.familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is admin
    const member = family.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Check if already invited
    const existingInvitation = await Invitation.findOne({
      family: req.params.familyId,
      email,
      status: 'Pending'
    });

    if (existingInvitation) {
      return res.status(400).json({ success: false, message: 'Invitation already sent' });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await Invitation.create({
      family: req.params.familyId,
      email,
      invitedBy: req.user._id,
      role,
      relationship,
      token,
      expiresAt
    });

    // Send email
    const inviteLink = `${process.env.CLIENT_URL}/invite/${token}`;
    const html = `
      <h2>You've been invited to join ${family.name}!</h2>
      <p>${req.user.firstName} ${req.user.lastName} has invited you to join their family on Family App.</p>
      <p><a href="${inviteLink}" style="background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
      <p>This invitation will expire in 7 days.</p>
    `;

    await sendEmail({
      email,
      subject: `Invitation to join ${family.name}`,
      html
    });

    const populatedInvitation = await Invitation.findById(invitation._id)
      .populate('invitedBy', 'firstName lastName email');

    res.status(201).json({ success: true, data: populatedInvitation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/invitations/accept/:token
// @desc    Accept invitation
// @access  Public
router.post('/accept/:token', async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ token: req.params.token });

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    if (invitation.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Invitation already processed' });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'Expired';
      await invitation.save();
      return res.status(400).json({ success: false, message: 'Invitation expired' });
    }

    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const family = await Family.findById(invitation.family);
    
    // Add user to family
    family.members.push({
      user: userId,
      role: invitation.role,
      relationship: invitation.relationship
    });

    await family.save();

    invitation.status = 'Accepted';
    await invitation.save();

    res.json({ success: true, message: 'Invitation accepted', data: family });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/invitations/:id
// @desc    Cancel invitation
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    if (invitation.invitedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await invitation.deleteOne();

    res.json({ success: true, message: 'Invitation cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
