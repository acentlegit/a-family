const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/email');
const getClientUrl = require('../utils/getClientUrl');
const crypto = require('crypto');
const { JWT_SECRET } = require('../config/env');

const JWT_SECRET_FINAL = JWT_SECRET;

// Note: Rate limiting is applied at the server level for /api/auth routes

// Generate JWT Token (short-lived access token)
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET_FINAL, {
    expiresIn: process.env.JWT_EXPIRE || '15m' // Short-lived: 15 minutes
  });
};

// Generate Refresh Token (long-lived)
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET_FINAL, {
    expiresIn: '7d' // 7 days
  });
};

// Store refresh token in database
const storeRefreshToken = async (userId, refreshToken) => {
  const crypto = require('crypto');
  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + 7); // 7 days
  
  await User.findByIdAndUpdate(userId, {
    refreshToken: hashedToken,
    refreshTokenExpire: expireDate
  });
};

// @route   POST /api/auth/check-default-user
// @desc    Check if email matches default user or admin
// @access  Public
router.post('/check-default-user', async (req, res) => {
  try {
    const { email } = req.body;
    // Default common user email (from environment only)
    const defaultEmail = process.env.DEFAULT_USER_EMAIL || '';
    // Admin user email (from environment only)
    const adminEmail = process.env.ADMIN_USER_EMAIL || '';
    
    if (email && email.toLowerCase() === defaultEmail.toLowerCase()) {
      return res.json({ isDefaultUser: true, isAdmin: false });
    }
    
    if (email && email.toLowerCase() === adminEmail.toLowerCase()) {
      return res.json({ isDefaultUser: false, isAdmin: true });
    }
    
    return res.json({ isDefaultUser: false, isAdmin: false });
  } catch (error) {
    return res.json({ isDefaultUser: false, isAdmin: false });
  }
});

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    // Prevent registration with admin email (from environment only)
    const adminEmail = process.env.ADMIN_USER_EMAIL || '';
    if (email && email.toLowerCase() === adminEmail.toLowerCase()) {
      return res.status(403).json({ 
        success: false, 
        message: 'This email is reserved for admin. Cannot register with this email.' 
      });
    }

    // Prevent registration with default user email (from environment)
    const defaultEmail = process.env.DEFAULT_USER_EMAIL || '';
    if (email && defaultEmail && email.toLowerCase() === defaultEmail.toLowerCase()) {
      return res.status(403).json({ 
        success: false, 
        message: 'This email is reserved. Please use the provided login credentials instead.' 
      });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // SECURITY: Force role to USER for public signup
    // Never accept role from frontend - admins are created via invite only
    user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: 'USER' // Always USER for public signup
    });

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Store refresh token
    await storeRefreshToken(user._id, refreshToken);

    // Send welcome email
    try {
      const clientUrl = getClientUrl();
      // Add query parameter to indicate user came from email (so login page doesn't pre-fill default credentials)
      const loginUrl = `${clientUrl}/login?from=email`;
      
      const emailText = `Welcome to Fami, ${user.firstName}!

Thank you for registering with Fami - Your Family Connection Platform.

Your account has been successfully created with the following details:
Name: ${user.firstName} ${user.lastName}
Email: ${user.email}

You can now:
- Create or join families
- Add family members
- Share memories and photos
- Organize family events
- Connect with your loved ones

Get started by logging in to your account and creating your first family!

═══════════════════════════════════════════════════════════
  LOGIN LINK - CLICK OR COPY THIS URL:
═══════════════════════════════════════════════════════════

${loginUrl}

═══════════════════════════════════════════════════════════

Click the link above or copy and paste it into your browser to login.

Best regards,
The Fami Team`;

      await sendEmail({
        to: user.email,
        subject: 'Welcome to Fami - Registration Successful!',
        text: emailText,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">Welcome to Fami, ${user.firstName}!</h2>
            <p>Thank you for registering with Fami - Your Family Connection Platform.</p>
            <p>Your account has been successfully created with the following details:</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
            </div>
            <p>You can now:</p>
            <ul>
              <li>Create or join families</li>
              <li>Add family members</li>
              <li>Share memories and photos</li>
              <li>Organize family events</li>
              <li>Connect with your loved ones</li>
            </ul>
            <p style="font-size: 18px; font-weight: 600; margin: 25px 0;"><strong>Get started by logging in to your account and creating your first family!</strong></p>
            
            <div style="text-align: center; margin: 35px 0; padding: 25px; background: #f0f4ff; border: 2px solid #6366f1; border-radius: 12px;">
              <p style="margin: 0 0 15px 0; font-weight: 600; color: #1e40af; font-size: 16px;">Click here to login:</p>
              <a href="${loginUrl}" style="display: inline-block; background: #6366f1; color: white !important; padding: 16px 40px; text-decoration: none !important; border-radius: 8px; font-weight: 700; font-size: 18px; margin: 10px 0;">Login to Your Account</a>
            </div>
            
            <div style="text-align: center; margin: 25px 0; padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #856404; font-size: 16px;">Or copy this login link:</p>
              <p style="margin: 0; padding: 12px; background: white; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 16px;">
                <a href="${loginUrl}" style="color: #6366f1 !important; text-decoration: underline !important; font-weight: 600;">${loginUrl}</a>
              </p>
            </div>
            
            <p style="text-align: center; margin: 30px 0; padding: 15px; background: #e0f2fe; border-left: 4px solid #0284c7; font-size: 16px;">
              <strong>Login URL:</strong><br>
              <span style="font-family: monospace; color: #0284c7; font-weight: 600; font-size: 14px;">${loginUrl}</span>
            </p>
            
            <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">Click the button above or copy and paste the link into your browser to login.</p>
            <p style="margin-top: 30px;">Best regards,<br>The Fami Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('❌ Error sending welcome email:', emailError.message || emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin || user.role === 'SUPER_ADMIN'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  // Accept both email and username (not just email format)
  body('email').notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check MongoDB connection - wait if connecting
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection unavailable. Please try again in a moment.' 
      });
    }
    
    // If connecting (state 2), wait a bit for connection
    if (mongoose.connection.readyState === 2) {
      // Wait up to 5 seconds for connection
      let attempts = 0;
      while (mongoose.connection.readyState !== 1 && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ 
          success: false, 
          message: 'Database connection is still establishing. Please try again in a moment.' 
        });
      }
    }

    // Check if request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request format. Please ensure Content-Type is application/json.',
        errors: [{ msg: 'Request body is missing or invalid' }]
      });
    }

    // Trim email to handle whitespace issues
    // NOTE: Do NOT trim password - passwords may intentionally have leading/trailing spaces
    if (req.body.email && typeof req.body.email === 'string') {
      req.body.email = req.body.email.trim();
    }
    // Only trim password if it's clearly accidental (has spaces on both ends)
    if (req.body.password && typeof req.body.password === 'string') {
      const originalPassword = req.body.password;
      // Only trim if password starts AND ends with space (likely accidental)
      if (originalPassword.startsWith(' ') && originalPassword.endsWith(' ')) {
        req.body.password = originalPassword.trim();
      }
    }
    
    // Additional check: ensure fields are not empty after trimming
    if (!req.body.email || req.body.email === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Username or email is required',
        errors: [{ msg: 'Username or email is required', param: 'email' }]
      });
    }
    
    if (!req.body.password || req.body.password === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required',
        errors: [{ msg: 'Password is required', param: 'password' }]
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: errors.array()[0].msg || 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Check if this is the super admin user (from environment only)
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || '';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || '';
    const isSuperAdminUser = superAdminEmail && email.toLowerCase() === superAdminEmail.toLowerCase();
    
    // Check if this is the default common user (from environment only)
    const defaultUserEmail = process.env.DEFAULT_USER_EMAIL || '';
    const defaultUserPassword = process.env.DEFAULT_USER_PASSWORD || '';
    const isDefaultUser = defaultUserEmail && email.toLowerCase() === defaultUserEmail.toLowerCase();
    
    // Check if this is the admin user (from environment only)
    const adminEmail = process.env.ADMIN_USER_EMAIL || '';
    const adminPassword = process.env.ADMIN_USER_PASSWORD || '';
    const isAdminUser = adminEmail && email.toLowerCase() === adminEmail.toLowerCase() && !isSuperAdminUser;

    let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    // If default user doesn't exist, create it
    if (isDefaultUser && !user && defaultUserPassword) {
      const defaultFirstName = process.env.DEFAULT_USER_FIRST_NAME || 'Default';
      const defaultLastName = process.env.DEFAULT_USER_LAST_NAME || 'User';
      
      user = await User.create({
        email: defaultUserEmail.toLowerCase(),
        password: defaultUserPassword,
        firstName: defaultFirstName,
        lastName: defaultLastName,
        role: 'USER'
      });
    }
    
    // If super admin user doesn't exist, create it (check this FIRST since it shares email with admin)
    if (isSuperAdminUser && !user && superAdminPassword) {
      const superAdminFirstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Admin';
      const superAdminLastName = process.env.SUPER_ADMIN_LAST_NAME || 'User';
      
      user = await User.create({
        email: superAdminEmail.toLowerCase(),
        password: superAdminPassword,
        firstName: superAdminFirstName,
        lastName: superAdminLastName,
        role: 'SUPER_ADMIN'
      });
    }
    
    // If admin user doesn't exist, create it (only if not super admin)
    if (isAdminUser && !user && adminPassword) {
      const adminFirstName = process.env.ADMIN_USER_FIRST_NAME || 'Chandra';
      const adminLastName = process.env.ADMIN_USER_LAST_NAME || 'Acentle';
      
      user = await User.create({
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: 'ADMIN'
      });
    }
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Verify password - try multiple methods to handle variations
    let isMatch = false;
    const passwordVariations = [];
    
    // Add original password
    if (password) {
      passwordVariations.push(password);
      // Add trimmed version
      if (password.trim() !== password) {
        passwordVariations.push(password.trim());
      }
      // For super admin/admin user, try with/without # at the end (if applicable)
      if ((isSuperAdminUser || isAdminUser) && (superAdminPassword || adminPassword)) {
        const envPwd = isSuperAdminUser ? superAdminPassword : adminPassword;
        if (envPwd && envPwd.endsWith('#') && !password.endsWith('#')) {
          passwordVariations.push(password + '#'); // Add #
        } else if (envPwd && !envPwd.endsWith('#') && password.endsWith('#')) {
          passwordVariations.push(password.slice(0, -1)); // Remove #
        }
      }
    }
    
    // Try each password variation with bcrypt
    for (const pwd of passwordVariations) {
      if (pwd) {
        const match = await user.comparePassword(pwd);
        if (match) {
          isMatch = true;
          break;
        }
      }
    }
    
    // If bcrypt fails, try direct comparison with env password for super admin/admin/default users
    if (!isMatch && (isSuperAdminUser || isAdminUser || isDefaultUser)) {
      let envPwd = null;
      if (isSuperAdminUser) {
        envPwd = superAdminPassword;
      } else if (isAdminUser) {
        envPwd = adminPassword;
      } else if (isDefaultUser) {
        envPwd = defaultUserPassword;
      }
      
      if (envPwd) {
        // Try all password variations against env password
        for (const pwd of passwordVariations) {
          if (pwd === envPwd || pwd.trim() === envPwd) {
            isMatch = true;
            // Update password in database to ensure it's hashed correctly
            user.password = envPwd;
            await user.save({ validateBeforeSave: false });
            break;
          }
        }
      }
    }
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Store refresh token
    await storeRefreshToken(user._id, refreshToken);

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin || user.role === 'SUPER_ADMIN'
    };

    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: userResponse
    });
  } catch (error) {
    console.error('❌ Login server error:', error.message || error);
    res.status(500).json({ success: false, message: error.message || 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/auth/update-profile
// @desc    Update user profile (including hobbies, occupation, bio, address, city, country)
// @access  Private
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phone, dateOfBirth, gender, hobbies, occupation, bio, address, city, country } = req.body;

    // Prepare update data - convert empty strings to undefined for optional fields
    const updateData = {
      firstName,
      lastName,
      phone: phone || undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined, // Don't send empty string for enum field
      hobbies: hobbies || undefined,
      occupation: occupation || undefined,
      bio: bio || undefined,
      address: address || undefined,
      city: city || undefined,
      country: country || undefined
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Setup multer for avatar uploads
const multer = require('multer');
const path = require('path');

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, 'avatar-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const avatarUpload = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const homepageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, 'homepage-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});

const homepageUpload = multer({
  storage: homepageStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// @route   POST /api/auth/upload-avatar
// @desc    Upload user avatar
// @access  Private
router.post('/upload-avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const getBaseUrl = require('../utils/getBaseUrl');
    const baseUrl = getBaseUrl();
    const avatarUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/public/site-homepage
// @desc    Latest published homepage (anonymous visitors see the same branded page)
// @access  Public
router.get('/public/site-homepage', async (req, res) => {
  try {
    const users = await User.find({
      'homepageCustomization.status': 'published',
      'homepageCustomization.enabled': true
    })
      .sort({ 'homepageCustomization.updatedAt': -1 })
      .limit(1)
      .select('homepageCustomization')
      .lean();

    const doc = users[0];
    const h = doc?.homepageCustomization;
    if (!h) {
      return res.json({ success: true, data: null });
    }

    return res.json({
      success: true,
      data: {
        theme: h.theme || 'default',
        title: h.title || '',
        subtitle: h.subtitle || '',
        description: h.description || '',
        heroImage: h.heroImage || '',
        accentColor: h.accentColor || '',
        enabled: true,
        status: 'published'
      }
    });
  } catch (error) {
    console.error('public site-homepage:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/homepage-customization
// @desc    Get current user's homepage customization
// @access  Private
router.get('/homepage-customization', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('homepageCustomization');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({
      success: true,
      data: user.homepageCustomization || {
        enabled: false,
        status: 'draft',
        theme: 'default',
        title: '',
        subtitle: '',
        description: '',
        heroImage: '',
        accentColor: ''
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

async function handleHomepageCustomizationPut(req, res) {
  try {
    const { enabled, theme, title, subtitle, description, status, removeHeroImage, accentColor } = req.body;
    const heroImageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const validTheme = ['default', 'light', 'dark'].includes(String(theme)) ? String(theme) : 'default';
    const validStatus = ['draft', 'published'].includes(String(status)) ? String(status) : 'draft';
    const updatePayload = {
      'homepageCustomization.enabled': String(enabled) === 'true' || enabled === true,
      'homepageCustomization.status': validStatus,
      'homepageCustomization.theme': validTheme,
      'homepageCustomization.title': String(title || '').trim(),
      'homepageCustomization.subtitle': String(subtitle || '').trim(),
      'homepageCustomization.description': String(description || '').trim(),
      'homepageCustomization.updatedAt': new Date()
    };

    if (Object.prototype.hasOwnProperty.call(req.body, 'accentColor')) {
      const accentTrim = String(accentColor || '').trim();
      updatePayload['homepageCustomization.accentColor'] = /^#[0-9A-Fa-f]{6}$/.test(accentTrim) ? accentTrim : '';
    }

    if (heroImageUrl) {
      updatePayload['homepageCustomization.heroImage'] = heroImageUrl;
    }
    if (String(removeHeroImage) === 'true') {
      updatePayload['homepageCustomization.heroImage'] = '';
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updatePayload,
      { new: true }
    ).select('homepageCustomization');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'Homepage customized successfully',
      data: user.homepageCustomization
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// @route   PUT /api/auth/homepage-customization
// @desc    Update current user's homepage customization (JSON or multipart when uploading hero)
// @access  Private
router.put('/homepage-customization', protect, (req, res, next) => {
  const ct = String(req.headers['content-type'] || '');
  if (ct.includes('multipart/form-data')) {
    return homepageUpload.single('heroImage')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
      }
      next();
    });
  }
  next();
}, handleHomepageCustomizationPut);

// @route   POST /api/auth/homepage-customization/reset
// @desc    Reset current user's homepage customization to default
// @access  Private
router.post('/homepage-customization/reset', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'homepageCustomization.enabled': false,
        'homepageCustomization.status': 'draft',
        'homepageCustomization.theme': 'default',
        'homepageCustomization.title': '',
        'homepageCustomization.subtitle': '',
        'homepageCustomization.description': '',
        'homepageCustomization.heroImage': '',
        'homepageCustomization.accentColor': '',
        'homepageCustomization.updatedAt': new Date()
      },
      { new: true }
    ).select('homepageCustomization');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'Homepage reset to default',
      data: user.homepageCustomization
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/auth/update-notifications
// @desc    Update notification preferences
// @access  Private
router.put('/update-notifications', protect, async (req, res) => {
  try {
    const { emailNotifications, pushNotifications, eventReminders, newMemories } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        notifications: {
          emailNotifications,
          pushNotifications,
          eventReminders,
          newMemories
        }
      },
      { new: true }
    );

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/auth/update-privacy
// @desc    Update privacy settings
// @access  Private
router.put('/update-privacy', protect, async (req, res) => {
  try {
    const { profileVisibility } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { privacy: { profileVisibility } },
      { new: true }
    );

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists for security
      return res.json({ 
        success: true, 
        message: 'If an account exists with that email, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpire = resetPasswordExpire;
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const getClientUrl = require('../utils/getClientUrl');
    const clientUrl = getClientUrl();
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    // Send email
    const message = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your Fami account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">
        Reset Password
      </a>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        Fami - Your Family Connection Platform
      </p>
    `;

    try {
      const emailResult = await sendEmail({
        email: user.email,
        subject: 'Password Reset Request - Fami',
        html: message,
        text: `You requested a password reset. Click this link: ${resetUrl}`
      });

      if (!emailResult) {
        console.warn('⚠️  Email service not configured - password reset email not sent');
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        
        return res.status(503).json({ 
          success: false, 
          message: 'Email service is not available. The SendGrid API key may be invalid or expired.',
          hint: 'Please regenerate the SendGrid API key at https://app.sendgrid.com/ and update the SENDGRID_API_KEY in the .env file.'
        });
      }

    } catch (emailError) {
      console.error('❌ Error sending password reset email:', emailError.message || emailError);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(503).json({ 
        success: false, 
        message: 'Email service is not available. The SendGrid API key may be invalid or expired.',
        hint: 'Please regenerate the SendGrid API key at https://app.sendgrid.com/ and update the SENDGRID_API_KEY in the .env file.'
      });
    }

    res.json({ 
      success: true, 
      message: 'If an account exists with that email, a password reset link has been sent.' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password with token
// @access  Public
router.post('/reset-password/:token', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { token } = req.params;
    const { password } = req.body;

    // Hash token to compare with stored token
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send confirmation email
    const message = `
      <h2>Password Reset Successful</h2>
      <p>Your password has been successfully reset.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        Fami - Your Family Connection Platform
      </p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Successful - Fami',
        html: message,
        text: 'Your password has been successfully reset.'
      });
    } catch (emailError) {
      console.error('❌ Error sending password reset confirmation email:', emailError.message || emailError);
      // Don't fail the request if email fails
    }

    res.json({ 
      success: true, 
      message: 'Password reset successful. You can now login with your new password.' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/auth/update-s3-config
// @desc    Update user's S3 configuration
// @access  Private
router.put('/update-s3-config', protect, async (req, res) => {
  try {
    const { accessKeyId, secretAccessKey, bucket, region, enabled } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update S3 configuration
    user.s3Config = {
      accessKeyId: accessKeyId || user.s3Config?.accessKeyId || '',
      secretAccessKey: secretAccessKey || user.s3Config?.secretAccessKey || '',
      bucket: bucket || user.s3Config?.bucket || '',
      region: region || user.s3Config?.region || 'us-east-1',
      enabled: enabled !== undefined ? enabled : (user.s3Config?.enabled || false)
    };

    await user.save();

    // Return user without sensitive data
    const updatedUser = await User.findById(user._id).select('-password -s3Config.secretAccessKey');

    res.json({
      success: true,
      message: 'S3 configuration updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating S3 config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/s3-config
// @desc    Get user's S3 configuration (without secret key)
// @access  Private
router.get('/s3-config', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('s3Config');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Return config without secret key
    const config = {
      accessKeyId: user.s3Config?.accessKeyId || '',
      bucket: user.s3Config?.bucket || '',
      region: user.s3Config?.region || 'us-east-1',
      enabled: user.s3Config?.enabled || false,
      hasSecretKey: !!(user.s3Config?.secretAccessKey)
    };

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error fetching S3 config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/test-s3-config
// @desc    Test S3 configuration
// @access  Private
router.post('/test-s3-config', protect, async (req, res) => {
  try {
    const { accessKeyId, secretAccessKey, bucket, region } = req.body;

    if (!accessKeyId || !secretAccessKey || !bucket) {
      return res.status(400).json({ 
        success: false, 
        message: 'Access Key ID, Secret Access Key, and Bucket are required' 
      });
    }

    // Test S3 connection
    const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      region: region || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    const command = new HeadBucketCommand({ Bucket: bucket });
    await s3Client.send(command);

    res.json({
      success: true,
      message: 'S3 configuration is valid and bucket is accessible'
    });
  } catch (error) {
    console.error('Error testing S3 config:', error);
    
    let message = 'Failed to connect to S3';
    if (error.name === 'NoSuchBucket') {
      message = 'Bucket does not exist';
    } else if (error.name === 'InvalidAccessKeyId') {
      message = 'Invalid Access Key ID';
    } else if (error.name === 'SignatureDoesNotMatch') {
      message = 'Invalid Secret Access Key';
    } else if (error.name === 'AccessDenied') {
      message = 'Access denied - check your credentials and bucket permissions';
    }

    res.status(400).json({ 
      success: false, 
      message,
      error: error.message 
    });
  }
});

// @route   POST /api/auth/accept-invite/:token
// @desc    Accept admin invitation and set password
// @access  Public
router.post('/accept-invite/:token', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { token } = req.params;
    const { password } = req.body;

    // Hash token to compare with stored token
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      inviteToken: hashedToken,
      inviteTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired invitation token' 
      });
    }

    // Set password and clear invite token
    user.password = password;
    user.inviteToken = undefined;
    user.inviteTokenExpire = undefined;
    user.isVerified = true;
    await user.save();

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Store refresh token
    await storeRefreshToken(user._id, refreshToken);

    // Send welcome email
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Welcome to Fami Admin Team!</h2>
        <p>Hello ${user.firstName},</p>
        <p>Your admin account has been successfully activated.</p>
        <p>You can now login and access the admin dashboard.</p>
        <p style="margin-top: 30px;">Best regards,<br>The Fami Team</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Admin Account Activated - Fami',
        html: message,
        text: 'Your admin account has been successfully activated.'
      });
    } catch (emailError) {
      console.error('❌ Error sending admin activation email:', emailError.message || emailError);
      // Don't fail the request if email fails
    }

    res.json({ 
      success: true, 
      message: 'Admin account activated successfully',
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh access token using refresh token (with rotation)
// @access  Public
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Refresh token is required' 
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET_FINAL);
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired refresh token' 
      });
    }

    // Find user and verify stored refresh token
    const user = await User.findById(decoded.id).select('+refreshToken +refreshTokenExpire');
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Hash provided token to compare with stored token
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Verify stored refresh token matches and hasn't expired
    if (!user.refreshToken || user.refreshToken !== hashedToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid refresh token' 
      });
    }

    if (!user.refreshTokenExpire || user.refreshTokenExpire < Date.now()) {
      // Clear expired token
      user.refreshToken = undefined;
      user.refreshTokenExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(401).json({ 
        success: false, 
        message: 'Refresh token has expired' 
      });
    }

    // Token rotation: Generate new refresh token and invalidate old one
    const newAccessToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    
    // Store new refresh token (replaces old one)
    await storeRefreshToken(user._id, newRefreshToken);

    res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (invalidate refresh token)
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    // Clear refresh token
    await User.findByIdAndUpdate(req.user._id, {
      refreshToken: undefined,
      refreshTokenExpire: undefined
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/auth/switch-family/:familyId
// @desc    Switch active family for user
// @access  Private
router.put('/switch-family/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const Family = require('../models/Family');

    // Verify family exists and user is a member
    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ 
        success: false, 
        message: 'Family not found' 
      });
    }

    // Check if user is a member
    const isMember = family.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not a member of this family' 
      });
    }

    // Update active family
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { activeFamilyId: familyId },
      { new: true }
    ).select('-password -refreshToken');

    res.json({
      success: true,
      message: 'Active family switched successfully',
      user,
      family: {
        id: family._id,
        name: family.name,
        description: family.description
      }
    });
  } catch (error) {
    console.error('Error switching family:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/active-family
// @desc    Get user's active family
// @access  Private
router.get('/active-family', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('activeFamilyId');
    
    if (!user.activeFamilyId) {
      return res.json({
        success: true,
        hasActiveFamily: false,
        family: null
      });
    }

    const Family = require('../models/Family');
    const family = await Family.findById(user.activeFamilyId)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members.user', 'firstName lastName email avatar');

    res.json({
      success: true,
      hasActiveFamily: true,
      family
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
