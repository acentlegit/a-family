const express = require('express');
const router = express.Router();
const Family = require('../models/Family');
const { protect } = require('../middleware/auth');

// @route   GET /api/roles/:familyId
// @desc    Get roles and permissions for a family
// @access  Private
router.get('/:familyId', protect, async (req, res) => {
  try {
    const family = await Family.findById(req.params.familyId);

    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    const roles = {
      Admin: {
        permissions: [
          'manage_members',
          'manage_roles',
          'create_events',
          'delete_events',
          'create_memories',
          'delete_memories',
          'manage_settings',
          'send_invitations'
        ]
      },
      Member: {
        permissions: [
          'create_events',
          'create_memories',
          'comment',
          'like'
        ]
      },
      Guest: {
        permissions: [
          'view_content',
          'comment',
          'like'
        ]
      }
    };

    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
