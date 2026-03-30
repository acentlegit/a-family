

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const Family = require('../models/Family');
const Memory = require('../models/Memory');
const Event = require('../models/Event');
const Member = require('../models/Member');


router.get('/', protect, async (req, res) => {
  const startedAt = Date.now();
  try {
    const userId = req.user?._id;
    const families = await Family.find({ 'members.user': userId })
      .select('_id name description coverImage members createdAt updatedAt')
      .lean();
    const familyIds = families.map(f => f._id);

    if (familyIds.length === 0) {
      return res.json({
        success: true,
        data: {
          stats: {
            totalFamilies: 0,
            totalMembers: 0,
            totalMemories: 0,
            totalEvents: 0
          },
          families: [],
          recentActivities: []
        }
      });
    }

    const [totalMemories, totalEvents, memberCollectionCount, recentMemories, recentEvents] = await Promise.all([
      Memory.countDocuments({ family: { $in: familyIds } }),
      Event.countDocuments({ family: { $in: familyIds } }),
      Member.countDocuments({ family: { $in: familyIds } }),
      Memory.find({ family: { $in: familyIds } })
        .select('title createdAt family')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Event.find({ family: { $in: familyIds } })
        .select('title date family')
        .sort({ date: -1 })
        .limit(8)
        .lean()
    ]);

    // Fallback for installs that haven't created separate Member docs but use embedded Family.members
    const embeddedMemberCount = families.reduce((acc, f) => acc + ((f.members && Array.isArray(f.members)) ? f.members.length : 0), 0);
    const totalMembers = Math.max(Number(memberCollectionCount) || 0, embeddedMemberCount);

    const stats = {
      totalFamilies: families.length,
      totalMembers: totalMembers,
      totalMemories: totalMemories,
      totalEvents: totalEvents
    };

    const familyNameMap = new Map(
      families.map((f) => [String(f._id), f.name])
    );

    const activities = [
      ...recentMemories.map(m => ({
        type: 'memory',
        title: m.title,
        date: m.createdAt,
        familyId: m.family,
        familyName: familyNameMap.get(String(m.family)) || 'Family'
      })),
      ...recentEvents.map(e => ({
        type: 'event',
        title: e.title,
        date: e.date,
        familyId: e.family,
        familyName: familyNameMap.get(String(e.family)) || 'Family'
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

    if (process.env.LOG_API_TIMINGS === 'true') {
      const elapsedMs = Date.now() - startedAt;
      console.log(`[dashboard] user=${req.user?._id} families=${families.length} elapsed_ms=${elapsedMs}`);
    }

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
