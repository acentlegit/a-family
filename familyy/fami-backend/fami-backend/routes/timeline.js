const express = require('express');
const router = express.Router();
const TimelineEvent = require('../models/TimelineEvent');
const { protect } = require('../middleware/auth');

// @route   GET /api/timeline/:familyId
// @desc    Get all timeline events for a family
// @access  Private
router.get('/:familyId', protect, async (req, res) => {
  try {
    const events = await TimelineEvent.find({ family: req.params.familyId })
      .populate('createdBy', 'firstName lastName avatar')
      .sort({ year: 1, createdAt: 1 });

    res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/timeline/:familyId
// @desc    Create new timeline event
// @access  Private
router.post('/:familyId', protect, async (req, res) => {
  try {
    console.log(`📝 Timeline POST request: familyId=${req.params.familyId}`, req.body);
    const { year, title, description } = req.body;

    if (!year || !title) {
      return res.status(400).json({ success: false, message: 'Year and title are required' });
    }

    const event = await TimelineEvent.create({
      family: req.params.familyId,
      year,
      title,
      description: description || '',
      createdBy: req.user._id
    });

    const populatedEvent = await TimelineEvent.findById(event._id)
      .populate('createdBy', 'firstName lastName avatar');

    res.status(201).json({ success: true, data: populatedEvent });
  } catch (error) {
    console.error('Error creating timeline event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/timeline/:id
// @desc    Update timeline event
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let event = await TimelineEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Timeline event not found' });
    }

    // Check if user created the event or is family admin
    const Family = require('../models/Family');
    const family = await Family.findById(event.family);
    const isAdmin = family.members.some(m => 
      m.user.toString() === req.user._id.toString() && m.role === 'Admin'
    );

    if (event.createdBy.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { year, title, description } = req.body;
    const updateData = { 
      year: year || event.year,
      title: title || event.title,
      description: description !== undefined ? description : event.description,
      updatedAt: new Date()
    };

    event = await TimelineEvent.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('createdBy', 'firstName lastName avatar');

    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error updating timeline event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/timeline/:id
// @desc    Delete timeline event
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const event = await TimelineEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Timeline event not found' });
    }

    // Check if user created the event or is family admin
    const Family = require('../models/Family');
    const family = await Family.findById(event.family);
    const isAdmin = family.members.some(m => 
      m.user.toString() === req.user._id.toString() && m.role === 'Admin'
    );

    if (event.createdBy.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await TimelineEvent.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Timeline event deleted' });
  } catch (error) {
    console.error('Error deleting timeline event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
