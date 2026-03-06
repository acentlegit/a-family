const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const { protect } = require('../middleware/auth');

/**
 * GET /api/bios/:familyId
 * Get all member bios for a family
 */
router.get('/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    
    const members = await Member.find({ family: familyId })
      .select('firstName lastName bio photo relationship dateOfBirth')
      .sort({ firstName: 1 });
    
    res.json({ 
      success: true, 
      count: members.length, 
      data: members 
    });
  } catch (error) {
    console.error('Error fetching bios:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/bios/:familyId/:memberId
 * Get a specific member's bio
 */
router.get('/:familyId/:memberId', protect, async (req, res) => {
  try {
    const { familyId, memberId } = req.params;
    
    const member = await Member.findOne({ 
      _id: memberId, 
      family: familyId 
    }).select('firstName lastName bio photo relationship dateOfBirth');
    
    if (!member) {
      return res.status(404).json({ 
        success: false, 
        error: 'Member not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: member 
    });
  } catch (error) {
    console.error('Error fetching bio:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * PUT /api/bios/:familyId/:memberId
 * Update a member's bio
 */
router.put('/:familyId/:memberId', protect, async (req, res) => {
  try {
    const { familyId, memberId } = req.params;
    const { bio } = req.body;
    
    // Check if member exists and belongs to family
    const member = await Member.findOne({ 
      _id: memberId, 
      family: familyId 
    });
    
    if (!member) {
      return res.status(404).json({ 
        success: false, 
        error: 'Member not found' 
      });
    }
    
    // Check if user has permission (must be the member themselves or family admin)
    // For now, allow any authenticated user in the family
    member.bio = bio || '';
    member.updatedAt = Date.now();
    await member.save();
    
    res.json({ 
      success: true, 
      data: member 
    });
  } catch (error) {
    console.error('Error updating bio:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
