const express = require('express');
const router = express.Router();
const Family = require('../models/Family');
const { protect } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../utils/cloudinary');

// @route   GET /api/families/template/download
// @desc    Download Excel template for importing members (with real data if familyId provided)
// @access  Private
router.get('/template/download', protect, async (req, res) => {
  try {
    console.log('📥 Generating family members template...');
    const XLSX = require('xlsx');
    const Member = require('../models/Member');
    
    // Check if familyId is provided in query
    const { familyId } = req.query;
    let templateData = [];
    
    if (familyId) {
      // Export real family data
      const members = await Member.find({ family: familyId })
        .populate('father', 'firstName lastName')
        .populate('mother', 'firstName lastName')
        .populate('spouse', 'firstName lastName');
      
      if (members.length > 0) {
        templateData = members.map(member => ({
          'First Name': member.firstName || '',
          'Last Name': member.lastName || '',
          'Email': member.email || '',
          'Gender': member.gender || '',
          'Relationship': member.relationship || '',
          'Date of Birth': member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : '',
          'Generation': member.generation !== undefined ? member.generation : 0,
          'Father': member.father ? `${member.father.firstName} ${member.father.lastName}` : '',
          'Mother': member.mother ? `${member.mother.firstName} ${member.mother.lastName}` : '',
          'Spouse': member.spouse ? `${member.spouse.firstName} ${member.spouse.lastName}` : ''
        }));
      } else {
        // Empty template if no members
        templateData = [{
          'First Name': '',
          'Last Name': '',
          'Email': '',
          'Gender': '',
          'Relationship': '',
          'Date of Birth': '',
          'Generation': '',
          'Father': '',
          'Mother': '',
          'Spouse': ''
        }];
      }
    } else {
      // Default empty template
      templateData = [{
        'First Name': '',
        'Last Name': '',
        'Email': '',
        'Gender': '',
        'Relationship': '',
        'Date of Birth': '',
        'Generation': '',
        'Father': '',
        'Mother': '',
        'Spouse': ''
      }];
    }
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 25 }, // Email
      { wch: 10 }, // Gender
      { wch: 15 }, // Relationship
      { wch: 15 }, // Date of Birth
      { wch: 10 }  // Generation
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Members Template');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=family-members-template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
    
    console.log('✅ Template generated successfully');
  } catch (error) {
    console.error('❌ Error generating template:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/families/export-all
// @desc    Export all families with their members to Excel
// @access  Private
router.get('/export-all', protect, async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const Member = require('../models/Member');
    
    // Get all families for the user
    const families = await Family.find({
      'members.user': req.user._id
    }).populate('createdBy', 'firstName lastName email');
    
    const workbook = XLSX.utils.book_new();
    
    // Create a summary sheet
    const summaryData = families.map(family => ({
      'Family Name': family.name,
      'Description': family.description || '',
      'Passcode': family.passcode,
      'Created By': `${family.createdBy.firstName} ${family.createdBy.lastName}`,
      'Members Count': family.members.length,
      'Created Date': new Date(family.createdAt).toLocaleDateString()
    }));
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Families Summary');
    
    // Create a sheet for each family's members
    for (const family of families) {
      const members = await Member.find({ familyId: family._id });
      
      const memberData = members.map(member => ({
        'First Name': member.firstName,
        'Last Name': member.lastName || '',
        'Email': member.email || '',
        'Phone': member.phone || '',
        'Date of Birth': member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : '',
        'Gender': member.gender || '',
        'Relationship': member.relationship || '',
        'Generation': member.generation || 0
      }));
      
      if (memberData.length > 0) {
        const memberSheet = XLSX.utils.json_to_sheet(memberData);
        // Sanitize sheet name (max 31 chars, no special chars)
        const sheetName = family.name.substring(0, 31).replace(/[:\\/?*\[\]]/g, '');
        XLSX.utils.book_append_sheet(workbook, memberSheet, sheetName);
      }
    }
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=all-families-export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Export all error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/families
// @desc    Get all families for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const families = await Family.find({
      'members.user': req.user._id
    }).populate('createdBy', 'firstName lastName email avatar')
      .populate('members.user', 'firstName lastName email avatar');

    res.json({ success: true, count: families.length, data: families });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/families/:id
// @desc    Get single family
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const family = await Family.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members.user', 'firstName lastName email avatar');

    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is a member
    const isMember = family.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: family });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/families
// @desc    Create new family
// @access  Private
router.post('/', protect, upload.single('coverImage'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Family name is required' });
    }

    let coverImageUrl = '';
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, 'family-covers');
        coverImageUrl = result.secure_url;
      } catch (uploadError) {
        console.log('Cloudinary upload failed, continuing without cover image:', uploadError.message);
        // Continue without cover image if upload fails
      }
    }

    // Passcode will be auto-generated by the model's pre-save hook
    const family = await Family.create({
      name,
      description,
      coverImage: coverImageUrl,
      createdBy: req.user._id,
      members: [{
        user: req.user._id,
        role: 'Admin',
        relationship: 'Self'
      }]
    });

    const populatedFamily = await Family.findById(family._id)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members.user', 'firstName lastName email avatar');

    res.status(201).json({ success: true, data: populatedFamily });
  } catch (error) {
    console.error('Create family error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/families/:id
// @desc    Update family
// @access  Private
router.put('/:id', protect, upload.single('coverImage'), async (req, res) => {
  try {
    let family = await Family.findById(req.params.id);

    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is admin
    const member = family.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, description } = req.body;
    const updateData = { name, description };

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'family-covers');
      updateData.coverImage = result.secure_url;
    }

    family = await Family.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('createdBy', 'firstName lastName email avatar')
      .populate('members.user', 'firstName lastName email avatar');

    res.json({ success: true, data: family });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/families/:id
// @desc    Delete family
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const family = await Family.findById(req.params.id);

    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Only creator can delete
    if (family.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await family.deleteOne();

    res.json({ success: true, message: 'Family deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/families/:id/verify-passcode
// @desc    Verify family passcode
// @access  Private
router.post('/:id/verify-passcode', protect, async (req, res) => {
  try {
    const { passcode } = req.body;
    const family = await Family.findById(req.params.id);

    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    if (family.passcode === passcode) {
      res.json({ success: true, message: 'Passcode verified' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid passcode' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/families/:id/join
// @desc    Join a family with passcode
// @access  Private
router.post('/:id/join', protect, async (req, res) => {
  try {
    const { passcode, relationship } = req.body;
    
    if (!passcode) {
      return res.status(400).json({ success: false, message: 'Passcode is required' });
    }

    const family = await Family.findById(req.params.id);

    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Verify passcode
    if (family.passcode !== passcode) {
      return res.status(401).json({ success: false, message: 'Invalid passcode' });
    }

    // Check if user is already a member
    const isMember = family.members.some(m => m.user.toString() === req.user._id.toString());
    if (isMember) {
      return res.status(400).json({ success: false, message: 'You are already a member of this family' });
    }

    // Add user to family
    family.members.push({
      user: req.user._id,
      role: 'Member',
      relationship: relationship || 'Member'
    });

    await family.save();

    const populatedFamily = await Family.findById(family._id)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members.user', 'firstName lastName email avatar');

    res.json({ 
      success: true, 
      message: 'Successfully joined the family',
      data: populatedFamily 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/families/:id/import-excel
// @desc    Import family members from Excel file
// @access  Private
router.post('/:id/import-excel', protect, async (req, res) => {
  try {
    const multer = require('multer');
    const XLSX = require('xlsx');
    const path = require('path');
    const fs = require('fs');
    
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, 'uploads/');
      },
      filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
      }
    });
    
    const upload = multer({ 
      storage,
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.xlsx' && ext !== '.xls') {
          return cb(new Error('Only Excel files are allowed'));
        }
        cb(null, true);
      }
    }).single('file');
    
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      
      try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        const Member = require('../models/Member');
        const importedMembers = [];
        
        for (const row of data) {
          const memberData = {
            familyId: req.params.id,
            firstName: row['First Name'] || row['firstName'] || '',
            lastName: row['Last Name'] || row['lastName'] || '',
            email: row['Email'] || row['email'] || '',
            phone: row['Phone'] || row['phone'] || '',
            dateOfBirth: row['Date of Birth'] || row['dateOfBirth'] || null,
            gender: row['Gender'] || row['gender'] || '',
            relationship: row['Relationship'] || row['relationship'] || '',
            generation: row['Generation'] || row['generation'] || 1,
            addedBy: req.user._id
          };
          
          if (memberData.firstName && memberData.lastName) {
            const member = await Member.create(memberData);
            importedMembers.push(member);
          }
        }
        
        // Delete the uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({
          success: true,
          message: `Successfully imported ${importedMembers.length} members`,
          members: importedMembers
        });
      } catch (error) {
        // Delete the uploaded file if error occurs
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        throw error;
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/families/:id/export-excel
// @desc    Export family members to Excel file
// @access  Private
router.get('/:id/export-excel', protect, async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const Member = require('../models/Member');
    
    // Fix: Use 'family' field instead of 'familyId'
    const members = await Member.find({ family: req.params.id })
      .populate('father', 'firstName lastName')
      .populate('mother', 'firstName lastName')
      .populate('spouse', 'firstName lastName');
    
    console.log(`Exporting ${members.length} members for family ${req.params.id}`);
    
    if (members.length === 0) {
      // Return empty template if no members
      const data = [{
        'First Name': 'Example',
        'Last Name': 'Member',
        'Email': 'example@email.com',
        'Gender': 'Male',
        'Relationship': 'Father',
        'Date of Birth': '1980-01-01',
        'Generation': 0
      }];
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', 'attachment; filename=family-members-empty.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    }
    
    const data = members.map(member => ({
      'First Name': member.firstName || '',
      'Last Name': member.lastName || '',
      'Email': member.email || '',
      'Gender': member.gender || '',
      'Relationship': member.relationship || '',
      'Date of Birth': member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : '',
      'Generation': member.generation !== undefined ? member.generation : 1,
      'Father': member.father ? `${member.father.firstName} ${member.father.lastName}` : '',
      'Mother': member.mother ? `${member.mother.firstName} ${member.mother.lastName}` : '',
      'Spouse': member.spouse ? `${member.spouse.firstName} ${member.spouse.lastName}` : ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 25 }, // Email
      { wch: 10 }, // Gender
      { wch: 15 }, // Relationship
      { wch: 15 }, // Date of Birth
      { wch: 10 }, // Generation
      { wch: 20 }, // Father
      { wch: 20 }, // Mother
      { wch: 20 }  // Spouse
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=family-members.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
    
    console.log('✅ Excel file exported successfully');
  } catch (error) {
    console.error('❌ Error exporting to Excel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
