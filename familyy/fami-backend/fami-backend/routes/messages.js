const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Family = require('../models/Family');
const { protect } = require('../middleware/auth');

// @route   GET /api/messages/family/:familyId
// @desc    Get all messages for a family
// @access  Private
router.get('/family/:familyId', protect, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const family = await Family.findById(req.params.familyId);
    
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is a member
    const isMember = family.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const messages = await Message.find({
      family: req.params.familyId,
      deletedAt: null
    })
      .populate('user', 'firstName lastName avatar email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/messages
// @desc    Create a new message
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { familyId, content } = req.body;

    if (!familyId || !content) {
      return res.status(400).json({ success: false, message: 'FamilyId and content are required' });
    }

    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is a member
    const isMember = family.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const message = await Message.create({
      family: familyId,
      user: req.user._id,
      content: content.trim()
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('user', 'firstName lastName avatar email');

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(familyId.toString()).emit('message-received', populatedMessage);
      console.log(`📨 Message sent to family ${familyId} via Socket.IO`);
    } else {
      console.warn('⚠️  Socket.IO not available for real-time updates');
    }

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/messages/:messageId
// @desc    Update message (owner only)
// @access  Private
router.put('/:messageId', protect, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only owner can edit' });
    }

    message.content = content.trim();
    message.updatedAt = new Date();
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('user', 'firstName lastName avatar email');

    res.json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete message (soft delete - owner or admin)
// @access  Private
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const family = await Family.findById(message.family);
    const member = family.members.find(m => m.user.toString() === req.user._id.toString());

    if (!member) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Only owner or admin can delete
    if (message.user.toString() !== req.user._id.toString() && member.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only owner or admin can delete' });
    }

    message.deletedAt = new Date();
    await message.save();

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
