const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Family = require('../models/Family');
const Member = require('../models/Member');
const User = require('../models/User');
const FamilyTree = require('../models/FamilyTree');
const { protect } = require('../middleware/auth');
const xlsx = require('xlsx');

const normalizeNamePart = (value) => {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Try to use Cloudinary if configured, otherwise use local storage
let upload, uploadHandler;
try {
  const cloudinary = require('../utils/cloudinary');
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name') {
    upload = cloudinary.upload;
    uploadHandler = async (file) => {
      const result = await cloudinary.uploadToCloudinary(file.buffer, 'family-members');
      return result.secure_url;
    };
  } else {
    throw new Error('Cloudinary not configured');
  }
} catch (error) {
  // Fallback to local storage
  const localStorage = require('../utils/localStorage');
  const getBaseUrl = require('../utils/getBaseUrl');
  upload = localStorage.upload;
  uploadHandler = async (file) => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/uploads/${file.filename}`;
  };
}

// @route   GET /api/members
// @desc    Get all members (across all families for current user)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get all families the user belongs to
    const families = await Family.find({ 
      $or: [
        { createdBy: req.user._id },
        { members: req.user._id }
      ]
    });

    const familyIds = families.map(f => f._id);

    // Get all members from those families
    const members = await Member.find({ family: { $in: familyIds } })
      .populate('father', 'firstName lastName photo')
      .populate('mother', 'firstName lastName photo')
      .populate('spouse', 'firstName lastName photo')
      .populate('family', 'name')
      .sort({ dateOfBirth: 1, generation: 1, firstName: 1, lastName: 1 })
      .collation({ locale: 'en', strength: 2 });

    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Error fetching all members:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Specific /:familyId/bulk routes MUST be registered before /:familyId and /:familyId/:memberId ---
// @route   POST /api/members/:familyId/bulk
// @desc    Add multiple members at once with email invitations
// @access  Private
router.post('/:familyId/bulk', protect, async (req, res) => {
  try {
    const { members } = req.body;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide members array' });
    }

    const family = await Family.findById(req.params.familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    const addedMembers = [];
    let emailsSent = 0;

    for (const memberData of members) {
      if (!memberData.firstName || !memberData.lastName) {
        continue;
      }

      const member = await Member.create({
        family: req.params.familyId,
        firstName: normalizeNamePart(memberData.firstName),
        lastName: normalizeNamePart(memberData.lastName),
        email: memberData.email || '',
        relationship: memberData.relationship || 'Other',
        gender: memberData.gender || 'Other',
        generation: memberData.generation || 1,
        addedBy: req.user._id,
      });

      addedMembers.push(member);

      if (memberData.email && memberData.sendEmail !== false) {
        try {
          const sendEmail = require('../utils/email');
          await sendEmail({
            to: memberData.email,
            subject: `You've been added to ${family.name} family!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563EB;">Welcome to ${family.name}!</h2>
                <p>Hi ${memberData.firstName},</p>
                <p>You have been added to the <strong>${family.name}</strong> family on our Family Management App.</p>
                <p><strong>Your Details:</strong></p>
                <ul>
                  <li>Name: ${memberData.firstName} ${memberData.lastName}</li>
                  <li>Relationship: ${memberData.relationship}</li>
                  <li>Family: ${family.name}</li>
                </ul>
                <p>To access the family portal and connect with your family members, please:</p>
                <ol>
                  <li>Visit our website</li>
                  <li>Register with this email address</li>
                  <li>Join the family using the family passcode</li>
                </ol>
                <p style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <strong>Family Passcode:</strong> <span style="font-size: 24px; color: #2563EB; font-family: monospace;">${family.passcode}</span>
                </p>
                <p>We're excited to have you as part of the family!</p>
                <p>Best regards,<br>The Family Management Team</p>
              </div>
            `,
          });
          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send email to ${memberData.email}:`, emailError);
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully added ${addedMembers.length} members`,
      addedCount: addedMembers.length,
      emailsSent,
      members: addedMembers,
    });
  } catch (error) {
    console.error('Bulk add members error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/members/:familyId/bulk
// @desc    Remove multiple members
// @access  Private
router.delete('/:familyId/bulk', protect, async (req, res) => {
  try {
    const raw = req.body?.ids;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Send a non-empty `ids` array of member IDs to delete.',
      });
    }
    const familyId = req.params.familyId;
    const uniqueIds = [...new Set(raw.map((id) => String(id)))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    if (uniqueIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid member IDs provided.' });
    }

    const result = await Member.deleteMany({
      _id: { $in: uniqueIds },
      family: familyId,
    });

    const oidList = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
    await Member.updateMany(
      { family: familyId, father: { $in: oidList } },
      { $unset: { father: 1 } }
    );
    await Member.updateMany(
      { family: familyId, mother: { $in: oidList } },
      { $unset: { mother: 1 } }
    );
    await Member.updateMany(
      { family: familyId, spouse: { $in: oidList } },
      { $unset: { spouse: 1 } }
    );

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} member(s).`,
    });
  } catch (error) {
    console.error('Bulk delete members error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/members/download-template
// @desc    Download Excel template (must be before /:familyId)
// @access  Private
router.get('/download-template', protect, (req, res) => {
  try {
    console.log('📥 Generating Excel template...');

    const data = [
      {
        'First Name': 'John',
        'Last Name': 'Doe',
        'Email': 'john@example.com',
        'Gender': 'Male',
        'Relationship': 'Father',
        'Date of Birth': '1980-01-15',
        Generation: 0,
      },
      {
        'First Name': 'Jane',
        'Last Name': 'Doe',
        'Email': 'jane@example.com',
        'Gender': 'Female',
        'Relationship': 'Mother',
        'Date of Birth': '1982-03-20',
        Generation: 0,
      },
      {
        'First Name': 'Mike',
        'Last Name': 'Doe',
        'Email': 'mike@example.com',
        'Gender': 'Male',
        'Relationship': 'Son',
        'Date of Birth': '2005-07-10',
        Generation: 1,
      },
    ];

    const worksheet = xlsx.utils.json_to_sheet(data);

    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Members');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=family-members-template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

    console.log('✅ Template downloaded successfully');
  } catch (error) {
    console.error('❌ Error generating template:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/members/:familyId
// @desc    Get all members of a family with tree structure
// @access  Private
router.get('/:familyId', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.familyId)) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }
    const members = await Member.find({ family: req.params.familyId })
      .populate('father', 'firstName lastName photo')
      .populate('mother', 'firstName lastName photo')
      .populate('spouse', 'firstName lastName photo')
      .sort({ dateOfBirth: 1, generation: 1, firstName: 1, lastName: 1 })
      .collation({ locale: 'en', strength: 2 });

    res.json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/members/:familyId
// @desc    Add new member to family
// @access  Private
router.post('/:familyId', protect, upload.single('photo'), async (req, res) => {
  try {
    const { firstName, lastName, email, gender, dateOfBirth, relationship, role, fatherId, motherId, spouseId, generation } = req.body;

    let photoUrl = '';
    if (req.file) {
      photoUrl = await uploadHandler(req.file);
    }

    const member = await Member.create({
      family: req.params.familyId,
      firstName: normalizeNamePart(firstName),
      lastName: normalizeNamePart(lastName),
      email,
      photo: photoUrl,
      gender,
      dateOfBirth,
      relationship,
      role: role || 'Member',
      father: fatherId || null,
      mother: motherId || null,
      spouse: spouseId || null,
      generation: generation || 0
    });

    const populatedMember = await Member.findById(member._id)
      .populate('father', 'firstName lastName photo')
      .populate('mother', 'firstName lastName photo')
      .populate('spouse', 'firstName lastName photo');

    // Get family details for email notification
    const family = await Family.findById(req.params.familyId);
    const addedByUser = await User.findById(req.user._id);
    const memberName = `${firstName} ${lastName || ''}`.trim();
    const addedByName = addedByUser ? `${addedByUser.firstName} ${addedByUser.lastName || ''}`.trim() : 'Someone';
    
    const { sendEmail, sendBulkEmail } = require('../utils/email');
    let emailsSent = 0;

    // Send welcome email to the newly added member if they have an email
    if (email && email.includes('@')) {
      console.log(`📧 Preparing to send welcome email to: ${email}`);
      try {
        const emailResult = await sendEmail({
          email: email,
          subject: `Welcome to ${family.name}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #667eea;">👋 Welcome to ${family.name}!</h2>
              <p>Hi ${firstName},</p>
              <p>You have been added to the <strong>${family.name}</strong> family on our Family Management App.</p>
              <div style="background: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Your Details:</strong></p>
                <p style="margin: 5px 0;"><strong>Name:</strong> ${memberName}</p>
                ${gender ? `<p style="margin: 5px 0;"><strong>Gender:</strong> ${gender}</p>` : ''}
                ${relationship ? `<p style="margin: 5px 0;"><strong>Relationship:</strong> ${relationship}</p>` : ''}
                ${dateOfBirth ? `<p style="margin: 5px 0;"><strong>Date of Birth:</strong> ${new Date(dateOfBirth).toLocaleDateString()}</p>` : ''}
                <p style="margin: 5px 0;"><strong>Family:</strong> ${family.name}</p>
              </div>
              <p>You can now log in and view your family tree.</p>
              <p style="color: #666; font-size: 14px;">If you don't have an account yet, please register with this email address to access the family portal.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">This is an automated notification from Fami Family Management App.</p>
            </div>
          `
        });
        if (emailResult) {
          emailsSent++;
          console.log(`✅ Welcome email sent to new member: ${email}`);
        } else {
          console.warn(`⚠️  Welcome email not sent to ${email} - SendGrid may not be configured or email failed`);
          console.warn(`⚠️  Check server logs above for detailed error messages`);
        }
      } catch (emailError) {
        console.error(`❌ Exception caught while sending welcome email to ${email}:`, emailError);
        console.error(`❌ Error stack:`, emailError.stack);
      }
    } else {
      console.log(`ℹ️  No email provided for new member: ${memberName}`);
    }
    
    // Get all family members' emails for notification
    const familyMembers = await Member.find({ family: req.params.familyId }).select('email firstName lastName');
    const familyUsers = await User.find({ _id: { $in: family.members.map(m => m.user) } }).select('email firstName lastName');
    
    // Collect all email addresses (excluding the added member's email if they have one)
    const notificationEmails = [];
    familyMembers.forEach(m => {
      if (m.email && m.email !== email && m.email.includes('@')) {
        notificationEmails.push(m.email);
      }
    });
    familyUsers.forEach(u => {
      if (u.email && u.email !== email && u.email.includes('@') && !notificationEmails.includes(u.email)) {
        notificationEmails.push(u.email);
      }
    });

    // Send email notification to other family members
    if (notificationEmails.length > 0) {
      try {
        console.log(`📧 Preparing to notify ${notificationEmails.length} family members about new member: ${memberName}`);
        const emailSubject = `New Family Member Added: ${memberName}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #667eea;">👨‍👩‍👧‍👦 New Family Member Added</h2>
            <p>Hello,</p>
            <p><strong>${addedByName}</strong> has added a new member to the <strong>${family.name}</strong> family tree:</p>
            <div style="background: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Name:</strong> ${memberName}</p>
              ${email ? `<p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>` : ''}
              ${gender ? `<p style="margin: 5px 0;"><strong>Gender:</strong> ${gender}</p>` : ''}
              ${relationship ? `<p style="margin: 5px 0;"><strong>Relationship:</strong> ${relationship}</p>` : ''}
              ${dateOfBirth ? `<p style="margin: 5px 0;"><strong>Date of Birth:</strong> ${new Date(dateOfBirth).toLocaleDateString()}</p>` : ''}
            </div>
            <p style="color: #666; font-size: 14px;">You can view the updated family tree in your Fami app.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">This is an automated notification from Fami Family Management App.</p>
          </div>
        `;
        
        const bulkResult = await sendBulkEmail(notificationEmails, emailSubject, emailHtml);
        if (bulkResult && bulkResult.success) {
          emailsSent += bulkResult.sent;
          console.log(`✅ Notification emails sent successfully: ${bulkResult.sent}/${bulkResult.total} to family members about new member: ${memberName}`);
        } else {
          console.warn(`⚠️  Bulk email notification failed or partially failed:`, bulkResult);
          if (bulkResult && bulkResult.sent > 0) {
            emailsSent += bulkResult.sent;
            console.log(`⚠️  Partial success: ${bulkResult.sent} emails sent out of ${bulkResult.total}`);
          }
        }
      } catch (emailError) {
        console.error(`❌ Exception caught while sending notification emails to family members:`, emailError);
        console.error(`❌ Error stack:`, emailError.stack);
      }
    } else {
      console.log(`ℹ️  No other family members to notify (or no valid email addresses found)`);
    }

    // Emit socket event for real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.familyId).emit('new-member', populatedMember);
    }

    // Create a clear message about email status
    let emailMessage = '';
    if (emailsSent > 0) {
      emailMessage = `${emailsSent} email(s) sent successfully.`;
    } else {
      if (!email || !email.includes('@')) {
        emailMessage = 'No email provided for member.';
      } else if (notificationEmails.length === 0) {
        emailMessage = 'Email provided but no other family members to notify.';
      } else {
        emailMessage = 'Email sending failed - check SendGrid configuration in server logs.';
      }
    }

    res.status(201).json({ 
      success: true, 
      data: populatedMember,
      message: `Member added successfully. ${emailMessage}`,
      emailsSent
    });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/members/:familyId/:memberId
// @desc    Update member details
// @access  Private
router.put('/:familyId/:memberId', protect, upload.single('photo'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.memberId)) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    const { firstName, lastName, email, gender, dateOfBirth, relationship, role, fatherId, motherId, spouseId, generation } = req.body;

    const member = await Member.findOne({ _id: req.params.memberId, family: req.params.familyId });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Update fields
    if (firstName) member.firstName = normalizeNamePart(firstName);
    if (lastName) member.lastName = normalizeNamePart(lastName);
    if (email) member.email = email;
    if (gender) member.gender = gender;
    if (dateOfBirth) member.dateOfBirth = dateOfBirth;
    if (relationship) member.relationship = relationship;
    if (role) member.role = role;
    if (fatherId !== undefined) member.father = fatherId || null;
    if (motherId !== undefined) member.mother = motherId || null;
    if (spouseId !== undefined) member.spouse = spouseId || null;
    if (generation !== undefined) member.generation = generation;

    // Update photo if provided
    if (req.file) {
      member.photo = await uploadHandler(req.file);
    }

    member.updatedAt = Date.now();
    await member.save();

    const updatedMember = await Member.findById(member._id)
      .populate('father', 'firstName lastName photo')
      .populate('mother', 'firstName lastName photo')
      .populate('spouse', 'firstName lastName photo');

    res.json({ success: true, data: updatedMember });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/members/:familyId/:memberId
// @desc    Remove member from family
// @access  Private
router.delete('/:familyId/:memberId', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.memberId)) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    const member = await Member.findOne({ _id: req.params.memberId, family: req.params.familyId });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    await member.deleteOne();

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/members/upload-excel/:familyId
// @desc    Upload members via Excel
// @access  Private
router.post('/upload-excel/:familyId', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const validMembers = [];
    const errors = [];

    data.forEach((row, index) => {
      if (!row.fullName || !row.email) {
        errors.push({ row: index + 2, message: 'Missing required fields' });
      } else {
        validMembers.push({
          fullName: row.fullName,
          email: row.email,
          relationship: row.relationship || '',
          role: row.role || 'Member'
        });
      }
    });

    res.json({
      success: true,
      data: {
        totalRows: data.length,
        validMembers: validMembers.length,
        errors: errors.length,
        members: validMembers,
        errorDetails: errors
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
