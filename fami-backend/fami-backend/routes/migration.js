const express = require('express');
const router = express.Router();
const MigrationLocation = require('../models/MigrationLocation');
const { protect } = require('../middleware/auth');

// @route   GET /api/migration/:familyId
// @desc    Get all migration locations for a family
// @access  Private
router.get('/:familyId', protect, async (req, res) => {
  try {
    const locations = await MigrationLocation.find({ family: req.params.familyId })
      .populate('createdBy', 'firstName lastName avatar')
      .sort({ order: 1, year: 1 });

    res.json({ success: true, count: locations.length, data: locations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/migration/:familyId
// @desc    Create new migration location
// @access  Private
router.post('/:familyId', protect, async (req, res) => {
  try {
    const { name, latitude, longitude, description, year, isOrigin, order } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Name, latitude, and longitude are required' });
    }

    const location = await MigrationLocation.create({
      family: req.params.familyId,
      name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      description: description || '',
      year: year || '',
      isOrigin: isOrigin === true || isOrigin === 'true',
      order: order || 0,
      createdBy: req.user._id
    });

    const populatedLocation = await MigrationLocation.findById(location._id)
      .populate('createdBy', 'firstName lastName avatar');

    res.status(201).json({ success: true, data: populatedLocation });
  } catch (error) {
    console.error('Error creating migration location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/migration/:id
// @desc    Update migration location
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let location = await MigrationLocation.findById(req.params.id);

    if (!location) {
      return res.status(404).json({ success: false, message: 'Migration location not found' });
    }

    // Check if user created the location or is family admin
    const Family = require('../models/Family');
    const family = await Family.findById(location.family);
    const isAdmin = family.members.some(m => 
      m.user.toString() === req.user._id.toString() && m.role === 'Admin'
    );

    if (location.createdBy.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, latitude, longitude, description, year, isOrigin, order } = req.body;
    const updateData = { 
      name: name || location.name,
      latitude: latitude !== undefined ? parseFloat(latitude) : location.latitude,
      longitude: longitude !== undefined ? parseFloat(longitude) : location.longitude,
      description: description !== undefined ? description : location.description,
      year: year !== undefined ? year : location.year,
      isOrigin: isOrigin !== undefined ? (isOrigin === true || isOrigin === 'true') : location.isOrigin,
      order: order !== undefined ? parseInt(order) : location.order,
      updatedAt: new Date()
    };

    location = await MigrationLocation.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('createdBy', 'firstName lastName avatar');

    res.json({ success: true, data: location });
  } catch (error) {
    console.error('Error updating migration location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/migration/:id
// @desc    Delete migration location
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const location = await MigrationLocation.findById(req.params.id);

    if (!location) {
      return res.status(404).json({ success: false, message: 'Migration location not found' });
    }

    // Check if user created the location or is family admin
    const Family = require('../models/Family');
    const family = await Family.findById(location.family);
    const isAdmin = family.members.some(m => 
      m.user.toString() === req.user._id.toString() && m.role === 'Admin'
    );

    if (location.createdBy.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await MigrationLocation.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Migration location deleted' });
  } catch (error) {
    console.error('Error deleting migration location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
