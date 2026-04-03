const express = require('express');
const router = express.Router();
const FamilyTree = require('../models/FamilyTree');
const Family = require('../models/Family');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.random().toString(36).substring(7) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get family tree for a specific family
router.get('/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    
    // Check if user has access to this family
    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    // Check if user is a member of this family
    const isMember = family.members.some(m => m.toString() === req.user.id);
    if (!isMember && family.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let familyTree = await FamilyTree.findOne({ family: familyId });
    
    if (!familyTree) {
      // Create empty tree if doesn't exist
      familyTree = new FamilyTree({
        family: familyId,
        nodes: [],
        uploadedBy: req.user.id
      });
      await familyTree.save();
    }

    res.json({ success: true, data: familyTree });
  } catch (error) {
    console.error('Error fetching family tree:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Add a node to family tree
router.post('/:familyId/nodes', protect, upload.single('photo'), async (req, res) => {
  try {
    const { familyId } = req.params;
    const { fullName, email, relationship, role, gender, dateOfBirth, dateOfDeath, parentId, spouseId, positionX, positionY } = req.body;

    // Check if user has access to this family
    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ success: false, message: 'Family not found' });
    }

    const isMember = family.members.some(m => m.toString() === req.user.id);
    if (!isMember && family.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let familyTree = await FamilyTree.findOne({ family: familyId });
    
    if (!familyTree) {
      familyTree = new FamilyTree({
        family: familyId,
        nodes: [],
        uploadedBy: req.user.id
      });
    }

    // Generate unique ID for the node
    const nodeId = 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Handle photo upload
    let photoPath = null;
    if (req.file) {
      photoPath = `/uploads/${req.file.filename}`;
    }

    // Create new node
    const newNode = {
      id: nodeId,
      fullName: fullName || '',
      email: email || '',
      relationship: relationship || '',
      role: role || '',
      gender: gender || '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : null,
      avatar: photoPath,
      parentId: parentId || null,
      spouseId: spouseId || null,
      position: {
        x: positionX ? parseFloat(positionX) : 0,
        y: positionY ? parseFloat(positionY) : 0
      }
    };

    familyTree.nodes.push(newNode);
    familyTree.updatedAt = new Date();
    await familyTree.save();

    res.json({ 
      success: true, 
      message: 'Node added successfully', 
      data: newNode 
    });
  } catch (error) {
    console.error('Error adding node:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update a node in family tree
router.put('/:familyId/nodes/:nodeId', protect, upload.single('photo'), async (req, res) => {
  try {
    const { familyId, nodeId } = req.params;
    const { fullName, email, relationship, role, gender, dateOfBirth, dateOfDeath, parentId, spouseId, positionX, positionY } = req.body;

    const familyTree = await FamilyTree.findOne({ family: familyId });
    if (!familyTree) {
      return res.status(404).json({ success: false, message: 'Family tree not found' });
    }

    const nodeIndex = familyTree.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      return res.status(404).json({ success: false, message: 'Node not found' });
    }

    // Update node fields
    if (fullName !== undefined) familyTree.nodes[nodeIndex].fullName = fullName;
    if (email !== undefined) familyTree.nodes[nodeIndex].email = email;
    if (relationship !== undefined) familyTree.nodes[nodeIndex].relationship = relationship;
    if (role !== undefined) familyTree.nodes[nodeIndex].role = role;
    if (gender !== undefined) familyTree.nodes[nodeIndex].gender = gender;
    if (dateOfBirth !== undefined) familyTree.nodes[nodeIndex].dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (dateOfDeath !== undefined) familyTree.nodes[nodeIndex].dateOfDeath = dateOfDeath ? new Date(dateOfDeath) : null;
    if (parentId !== undefined) familyTree.nodes[nodeIndex].parentId = parentId;
    if (spouseId !== undefined) familyTree.nodes[nodeIndex].spouseId = spouseId;
    if (positionX !== undefined) familyTree.nodes[nodeIndex].position.x = parseFloat(positionX);
    if (positionY !== undefined) familyTree.nodes[nodeIndex].position.y = parseFloat(positionY);

    // Handle photo upload
    if (req.file) {
      familyTree.nodes[nodeIndex].avatar = `/uploads/${req.file.filename}`;
    }

    familyTree.updatedAt = new Date();
    await familyTree.save();

    res.json({ 
      success: true, 
      message: 'Node updated successfully', 
      data: familyTree.nodes[nodeIndex] 
    });
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Delete a node from family tree
router.delete('/:familyId/nodes/:nodeId', protect, async (req, res) => {
  try {
    const { familyId, nodeId } = req.params;

    const familyTree = await FamilyTree.findOne({ family: familyId });
    if (!familyTree) {
      return res.status(404).json({ success: false, message: 'Family tree not found' });
    }

    const nodeIndex = familyTree.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      return res.status(404).json({ success: false, message: 'Node not found' });
    }

    familyTree.nodes.splice(nodeIndex, 1);
    familyTree.updatedAt = new Date();
    await familyTree.save();

    res.json({ success: true, message: 'Node deleted successfully' });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Export family tree as JSON
router.get('/:familyId/export', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    
    const familyTree = await FamilyTree.findOne({ family: familyId });
    if (!familyTree) {
      return res.status(404).json({ success: false, message: 'Family tree not found' });
    }

    res.json({ success: true, data: familyTree });
  } catch (error) {
    console.error('Error exporting family tree:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Import family tree from JSON
router.post('/:familyId/import', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { nodes } = req.body;

    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({ success: false, message: 'Invalid data format' });
    }

    let familyTree = await FamilyTree.findOne({ family: familyId });
    
    if (!familyTree) {
      familyTree = new FamilyTree({
        family: familyId,
        nodes: [],
        uploadedBy: req.user.id
      });
    }

    familyTree.nodes = nodes;
    familyTree.updatedAt = new Date();
    await familyTree.save();

    res.json({ success: true, message: 'Family tree imported successfully', data: familyTree });
  } catch (error) {
    console.error('Error importing family tree:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
