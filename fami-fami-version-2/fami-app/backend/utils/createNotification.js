const Notification = require('../models/Notification');
const Family = require('../models/Family');
const Member = require('../models/Member');

/**
 * Create notifications for family members
 * @param {Object} options - Notification options
 * @param {String} options.familyId - Family ID
 * @param {String} options.type - Notification type (invitation, event, memory, member_added, announcement, general)
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} options.link - Optional link to navigate to
 * @param {String} options.icon - Optional icon name
 * @param {String} options.createdBy - User ID who created the notification
 * @param {Array} options.excludeUsers - Array of user IDs to exclude from notification
 */
const createFamilyNotification = async (options) => {
  try {
    const { familyId, type, title, message, link, icon, createdBy, excludeUsers = [] } = options;

    // Get all family members
    const family = await Family.findById(familyId).populate('members');
    if (!family) {
      console.error('Family not found:', familyId);
      return;
    }

    // Get all members with user accounts
    const members = await Member.find({ 
      family: familyId,
      user: { $exists: true, $ne: null }
    }).populate('user');

    // Create notification for each member (except excluded users)
    const notifications = [];
    for (const member of members) {
      if (member.user && !excludeUsers.includes(member.user._id.toString())) {
        notifications.push({
          user: member.user._id,
          family: familyId,
          type,
          title,
          message,
          link,
          icon: icon || 'bell',
          createdBy
        });
      }
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`Created ${notifications.length} notifications for family ${familyId}`);
    }

    return notifications.length;
  } catch (error) {
    console.error('Error creating family notification:', error);
    return 0;
  }
};

/**
 * Create notification for a specific user
 * @param {Object} options - Notification options
 * @param {String} options.userId - User ID
 * @param {String} options.familyId - Optional family ID
 * @param {String} options.type - Notification type
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} options.link - Optional link
 * @param {String} options.icon - Optional icon
 * @param {String} options.createdBy - User ID who created the notification
 */
const createUserNotification = async (options) => {
  try {
    const { userId, familyId, type, title, message, link, icon, createdBy } = options;

    const notification = await Notification.create({
      user: userId,
      family: familyId,
      type,
      title,
      message,
      link,
      icon: icon || 'bell',
      createdBy
    });

    console.log(`Created notification for user ${userId}`);
    return notification;
  } catch (error) {
    console.error('Error creating user notification:', error);
    return null;
  }
};

module.exports = {
  createFamilyNotification,
  createUserNotification
};
