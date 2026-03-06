

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const Family = require('../models/Family');
const Memory = require('../models/Memory');
const Event = require('../models/Event');
const Member = require('../models/Member');


router.get('/', protect, async (req, res) => {


  try {
    const families = await Family.find().lean();
    const familyIds = families.map(f => f._id);

    const [memories, events, members] = await Promise.all([
      Memory.find({ family: { $in: familyIds } }).lean(),
      Event.find({ family: { $in: familyIds } }).lean(),
      Member.find({ family: { $in: familyIds } }).lean()
    ]);

    const stats = {
      totalFamilies: families.length,
      totalMembers: members.length,
      totalMemories: memories.length,
      totalEvents: events.length
    };

    const activities = [
      ...memories.map(m => ({
        type: 'memory',
        title: m.title,
        date: m.createdAt,
        familyId: m.family
      })),
      ...events.map(e => ({
        type: 'event',
        title: e.title,
        date: e.date,
        familyId: e.family
      }))
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        stats,
        families,
        recentActivities: activities
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
