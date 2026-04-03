const express = require('express');
const router = express.Router();
const superAdminAuth = require('../middleware/superAdmin');
const User = require('../models/User');
const Family = require('../models/Family');
const Member = require('../models/Member');
const Memory = require('../models/Memory');
const Event = require('../models/Event');
const Album = require('../models/Album');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

// ==================== STATISTICS ====================

// Get all families with statistics
router.get('/families', superAdminAuth, async (req, res) => {
  try {
    console.log('🔍 Super Admin fetching all families...');
    const families = await Family.find()
      .populate('createdBy', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${families.length} families in database`);

    const familiesWithStats = await Promise.all(families.map(async (family) => {
      const memoriesCount = await Memory.countDocuments({ family: family._id });
      const eventsCount = await Event.countDocuments({ family: family._id });
      const albumsCount = await Album.countDocuments({ family: family._id });

      return {
        ...family.toObject(),
        stats: {
          members: family.members ? family.members.length : 0,
          memories: memoriesCount,
          events: eventsCount,
          albums: albumsCount
        }
      };
    }));

    console.log(`✅ Returning ${familiesWithStats.length} families with stats`);
    res.json({ success: true, families: familiesWithStats });
  } catch (error) {
    console.error('❌ Error fetching families:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Get all users
router.get('/users', superAdminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -googleDriveTokens -s3Config')
      .sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(users.map(async (user) => {
      const familiesCreated = await Family.countDocuments({ createdBy: user._id });
      const familiesJoined = await Family.countDocuments({ members: { $in: [user._id] } });

      return {
        ...user.toObject(),
        stats: {
          familiesCreated,
          familiesJoined
        }
      };
    }));

    res.json({ success: true, users: usersWithStats });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get system statistics
router.get('/stats', superAdminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalFamilies = await Family.countDocuments();
    const totalMembers = await Member.countDocuments();
    const totalMemories = await Memory.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalAlbums = await Album.countDocuments();
    const totalMessages = await Message.countDocuments();

    // Get recent activity
    const recentFamilies = await Family.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'firstName lastName');

    const recentUsers = await User.find()
      .select('firstName lastName email createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentMemories = await Memory.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'firstName lastName')
      .populate('family', 'name');

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalFamilies,
        totalMembers,
        totalMemories,
        totalEvents,
        totalAlbums,
        totalMessages
      },
      recentActivity: {
        families: recentFamilies,
        users: recentUsers,
        memories: recentMemories
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== FAMILY CRUD ====================

// Create a new family (Super Admin)
router.post('/families', superAdminAuth, async (req, res) => {
  try {
    const { name, description, createdBy } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Family name is required' 
      });
    }

    // Use the current user as creator if not specified
    const creatorId = createdBy || req.user._id;

    // Create family with proper member structure
    const family = await Family.create({
      name,
      description: description || '',
      createdBy: creatorId,
      members: [{
        user: creatorId,
        role: 'Admin',
        relationship: 'Self',
        joinedAt: new Date()
      }]
    });

    const populatedFamily = await Family.findById(family._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');

    // Get statistics
    const memoriesCount = await Memory.countDocuments({ family: family._id });
    const eventsCount = await Event.countDocuments({ family: family._id });
    const albumsCount = await Album.countDocuments({ family: family._id });

    const familyWithStats = {
      ...populatedFamily.toObject(),
      stats: {
        members: populatedFamily.members.length,
        memories: memoriesCount,
        events: eventsCount,
        albums: albumsCount
      }
    };

    res.json({ 
      success: true, 
      message: 'Family created successfully',
      family: familyWithStats
    });
  } catch (error) {
    console.error('Error creating family:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Update a family (Super Admin)
router.put('/families/:familyId', superAdminAuth, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { name, description } = req.body;

    const family = await Family.findByIdAndUpdate(
      familyId,
      { name, description, updatedAt: new Date() },
      { new: true }
    )
    .populate('createdBy', 'firstName lastName email')
    .populate('members.user', 'firstName lastName email');

    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Get statistics
    const memoriesCount = await Memory.countDocuments({ family: family._id });
    const eventsCount = await Event.countDocuments({ family: family._id });
    const albumsCount = await Album.countDocuments({ family: family._id });

    const familyWithStats = {
      ...family.toObject(),
      stats: {
        members: family.members.length,
        memories: memoriesCount,
        events: eventsCount,
        albums: albumsCount
      }
    };

    res.json({ 
      success: true, 
      message: 'Family updated successfully',
      family: familyWithStats
    });
  } catch (error) {
    console.error('Error updating family:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a family (super admin only)
router.delete('/families/:familyId', superAdminAuth, async (req, res) => {
  try {
    const { familyId } = req.params;

    // Delete all related data
    await Memory.deleteMany({ family: familyId });
    await Event.deleteMany({ family: familyId });
    await Album.deleteMany({ family: familyId });
    await Member.deleteMany({ family: familyId });
    await Message.deleteMany({ family: familyId });
    await Notification.deleteMany({ family: familyId });
    await Family.findByIdAndDelete(familyId);

    res.json({ success: true, message: 'Family and all related data deleted successfully' });
  } catch (error) {
    console.error('Error deleting family:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get family details
router.get('/families/:familyId', superAdminAuth, async (req, res) => {
  try {
    const { familyId } = req.params;

    const family = await Family.findById(familyId)
      .populate('createdBy', 'firstName lastName email')
      .populate('members');

    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    const memories = await Memory.find({ family: familyId })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const events = await Event.find({ family: familyId })
      .populate('createdBy', 'firstName lastName')
      .sort({ startDate: -1 });

    const albums = await Album.find({ family: familyId })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const members = await Member.find({ family: familyId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      family,
      memories,
      events,
      albums,
      members
    });
  } catch (error) {
    console.error('Error fetching family details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add member to family (Super Admin)
router.post('/families/:familyId/members', superAdminAuth, async (req, res) => {
  try {
    const { familyId } = req.params;
    const memberData = req.body;

    const member = new Member({
      ...memberData,
      family: familyId
    });

    await member.save();

    res.json({ 
      success: true, 
      message: 'Member added successfully',
      member 
    });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update member (Super Admin)
router.put('/families/:familyId/members/:memberId', superAdminAuth, async (req, res) => {
  try {
    const { memberId } = req.params;
    const memberData = req.body;

    const member = await Member.findByIdAndUpdate(
      memberId,
      memberData,
      { new: true }
    );

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({ 
      success: true, 
      message: 'Member updated successfully',
      member 
    });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete member (Super Admin)
router.delete('/families/:familyId/members/:memberId', superAdminAuth, async (req, res) => {
  try {
    const { memberId } = req.params;

    await Member.findByIdAndDelete(memberId);

    res.json({ 
      success: true, 
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== USER CRUD ====================

// Create a new user (Super Admin)
router.post('/users', superAdminAuth, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone, dateOfBirth, gender } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, first name, and last name are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Only allow creating USER or ADMIN roles (not SUPER_ADMIN via API)
    const userRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: userRole,
      phone: phone || undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      isVerified: true
    });

    res.json({ 
      success: true, 
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user (Super Admin) - Prevent changing super admin email
router.put('/users/:userId', superAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, phone, dateOfBirth, gender } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent changing super admin email - only chandra@acentle.com can be super admin
    if (user.email === 'chandra@acentle.com' && email && email.toLowerCase() !== 'chandra@acentle.com') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot change super admin email. Only chandra@acentle.com can be super admin.' 
      });
    }

    // Prevent changing email to super admin email if user is not already super admin
    if (email && email.toLowerCase() === 'chandra@acentle.com' && user.email !== 'chandra@acentle.com') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot change email to super admin email. Only chandra@acentle.com can be super admin.' 
      });
    }

    const updateData = { firstName, lastName, phone, dateOfBirth, gender };
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      updateData.email = email.toLowerCase();
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password -googleDriveTokens -s3Config');

    res.json({ 
      success: true, 
      message: 'User updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user super admin status - Only chandra@acentle.com can be super admin
router.patch('/users/:userId/super-admin', superAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isSuperAdmin } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Only chandra@acentle.com can be super admin
    if (user.email !== 'chandra@acentle.com' && isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only chandra@acentle.com can be super admin. Cannot grant super admin status to other users.' 
      });
    }

    // If trying to remove super admin from chandra@acentle.com, prevent it
    if (user.email === 'chandra@acentle.com' && !isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cannot remove super admin status from chandra@acentle.com. This is the only allowed super admin.' 
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isSuperAdmin, role: isSuperAdmin ? 'SUPER_ADMIN' : 'USER' },
      { new: true }
    ).select('-password -googleDriveTokens -s3Config');

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a user (super admin only)
router.delete('/users/:userId', superAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Don't allow deleting yourself
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete your own account' 
      });
    }

    // Delete user's families and related data
    const userFamilies = await Family.find({ createdBy: userId });
    for (const family of userFamilies) {
      await Memory.deleteMany({ family: family._id });
      await Event.deleteMany({ family: family._id });
      await Album.deleteMany({ family: family._id });
      await Member.deleteMany({ family: family._id });
      await Message.deleteMany({ family: family._id });
      await Notification.deleteMany({ family: family._id });
      await Family.findByIdAndDelete(family._id);
    }

    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: 'User and all related data deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== ADVANCED FEATURES ====================

// Search across system
router.get('/search', superAdminAuth, async (req, res) => {
  try {
    const { query, type } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query required' });
    }

    const searchRegex = new RegExp(query, 'i');
    let results = {};

    if (!type || type === 'users') {
      results.users = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex }
        ]
      }).select('-password -googleDriveTokens -s3Config').limit(10);
    }

    if (!type || type === 'families') {
      results.families = await Family.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ]
      }).populate('createdBy', 'firstName lastName').limit(10);
    }

    if (!type || type === 'members') {
      results.members = await Member.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex }
        ]
      }).populate('family', 'name').limit(10);
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Bulk delete families
router.post('/families/bulk-delete', superAdminAuth, async (req, res) => {
  try {
    const { familyIds } = req.body;

    if (!Array.isArray(familyIds) || familyIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Family IDs array required' 
      });
    }

    for (const familyId of familyIds) {
      await Memory.deleteMany({ family: familyId });
      await Event.deleteMany({ family: familyId });
      await Album.deleteMany({ family: familyId });
      await Member.deleteMany({ family: familyId });
      await Message.deleteMany({ family: familyId });
      await Notification.deleteMany({ family: familyId });
      await Family.findByIdAndDelete(familyId);
    }

    res.json({ 
      success: true, 
      message: `${familyIds.length} families deleted successfully` 
    });
  } catch (error) {
    console.error('Error bulk deleting families:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Bulk delete users
router.post('/users/bulk-delete', superAdminAuth, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User IDs array required' 
      });
    }

    // Don't allow deleting yourself
    if (userIds.includes(req.user._id.toString())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete your own account' 
      });
    }

    for (const userId of userIds) {
      const userFamilies = await Family.find({ createdBy: userId });
      for (const family of userFamilies) {
        await Memory.deleteMany({ family: family._id });
        await Event.deleteMany({ family: family._id });
        await Album.deleteMany({ family: family._id });
        await Member.deleteMany({ family: family._id });
        await Message.deleteMany({ family: family._id });
        await Notification.deleteMany({ family: family._id });
        await Family.findByIdAndDelete(family._id);
      }
      await User.findByIdAndDelete(userId);
    }

    res.json({ 
      success: true, 
      message: `${userIds.length} users deleted successfully` 
    });
  } catch (error) {
    console.error('Error bulk deleting users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get activity logs (recent actions)
router.get('/activity-logs', superAdminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const recentFamilies = await Family.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy', 'firstName lastName email');

    const recentUsers = await User.find()
      .select('firstName lastName email createdAt')
      .sort({ createdAt: -1 })
      .limit(limit);

    const recentMemories = await Memory.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy', 'firstName lastName')
      .populate('family', 'name');

    const recentEvents = await Event.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy', 'firstName lastName')
      .populate('family', 'name');

    res.json({
      success: true,
      logs: {
        families: recentFamilies,
        users: recentUsers,
        memories: recentMemories,
        events: recentEvents
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Export system data
router.get('/export', superAdminAuth, async (req, res) => {
  try {
    const { type } = req.query;

    let data = {};

    if (!type || type === 'all' || type === 'users') {
      data.users = await User.find()
        .select('-password -googleDriveTokens -s3Config')
        .lean();
    }

    if (!type || type === 'all' || type === 'families') {
      data.families = await Family.find()
        .populate('createdBy', 'firstName lastName email')
        .lean();
    }

    if (!type || type === 'all' || type === 'members') {
      data.members = await Member.find()
        .populate('family', 'name')
        .lean();
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== ADMIN INVITE SYSTEM ====================

// Invite admin via email
router.post('/invite-admin', superAdminAuth, async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, first name, and last name are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Generate invite token
    const crypto = require('crypto');
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(inviteToken).digest('hex');
    const inviteTokenExpire = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    // Create user with ADMIN role and invite token
    const user = await User.create({
      email,
      firstName,
      lastName,
      password: crypto.randomBytes(32).toString('hex'), // Temporary password
      role: 'ADMIN',
      inviteToken: hashedToken,
      inviteTokenExpire,
      invitedBy: req.user._id
    });

    // Send invite email
    const sendEmail = require('../utils/email');
    const getClientUrl = require('../utils/getClientUrl');
    const clientUrl = getClientUrl();
    const inviteUrl = `${clientUrl}/accept-invite/${inviteToken}`;

    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Admin Invitation - Fami</h2>
        <p>Hello ${firstName},</p>
        <p>You have been invited by ${req.user.firstName} ${req.user.lastName} to become an administrator on Fami.</p>
        <p>As an admin, you will be able to:</p>
        <ul>
          <li>Manage users and families</li>
          <li>Moderate content</li>
          <li>Access admin dashboard</li>
          <li>View system analytics</li>
        </ul>
        <p>Click the button below to accept the invitation and set your password:</p>
        <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">
          Accept Invitation
        </a>
        <p>This invitation will expire in 7 days.</p>
        <p>If you didn't expect this invitation, please ignore this email.</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          Fami - Your Family Connection Platform
        </p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Admin Invitation - Fami',
        html: message,
        text: `You have been invited to become an admin on Fami. Click this link to accept: ${inviteUrl}`
      });
      console.log(`✅ Admin invite email sent to: ${user.email}`);
    } catch (emailError) {
      console.error('❌ Error sending admin invite email:', emailError);
      // Delete user if email fails
      await User.findByIdAndDelete(user._id);
      return res.status(503).json({ 
        success: false, 
        message: 'Failed to send invitation email. Please check email configuration.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Admin invitation sent successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error inviting admin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get audit logs
router.get('/audit-logs', superAdminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    
    const query = {};
    if (action) query.action = action;
    if (userId) query.user = userId;

    const AuditLog = require('../models/AuditLog');
    const logs = await AuditLog.find(query)
      .populate('user', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AuditLog.countDocuments(query);

    res.json({ 
      success: true, 
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
