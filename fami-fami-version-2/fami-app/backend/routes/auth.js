const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

// Use a safe default JWT secret in development if none is provided.
// This prevents runtime errors like "secretOrPrivateKey must have a value"
// when running locally without a .env file.
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

// Note: Rate limiting is applied at the server level for /api/auth routes

// Generate JWT Token (short-lived access token)
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m' // Short-lived: 15 minutes
  });
};

// Generate Refresh Token (long-lived)
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
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

    // Prevent registration with super admin email
    if (email && email.toLowerCase() === 'chandra@acentle.com') {
      return res.status(403).json({ 
        success: false, 
        message: 'This email is reserved for super admin. Cannot register with this email.' 
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
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Fami - Registration Successful!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
            <p>Get started by logging in to your account and creating your first family!</p>
            <p style="margin-top: 30px;">Best regards,<br>The Fami Team</p>
          </div>
        `
      });
      console.log('✅ Welcome email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Error sending welcome email:', emailError);
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
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    console.log('🔍 Login attempt for:', req.body.email);
    
    // Check MongoDB connection - wait if connecting
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
      console.log('❌ Login - Database not connected');
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection unavailable. Please try again in a moment.' 
      });
    }
    
    // If connecting (state 2), wait a bit for connection
    if (mongoose.connection.readyState === 2) {
      console.log('⏳ Login - Waiting for database connection...');
      // Wait up to 5 seconds for connection
      let attempts = 0;
      while (mongoose.connection.readyState !== 1 && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (mongoose.connection.readyState !== 1) {
        console.log('❌ Login - Database connection timeout');
        return res.status(503).json({ 
          success: false, 
          message: 'Database connection is still establishing. Please try again in a moment.' 
        });
      }
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Login - Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: errors.array()[0].msg,
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    console.log('🔍 Login - Looking up user:', email);
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      console.log('❌ Login - User not found:', email);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    console.log('🔍 Login - User found, verifying password...');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Login - Invalid password for:', email);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    console.log('✅ Login - Password verified, generating tokens...');
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

    console.log('✅ Login - Success for:', email, 'Role:', userResponse.role);
    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: userResponse
    });
  } catch (error) {
    console.error('❌ Login - Server error:', error);
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

      console.log(`✅ Password reset email sent to: ${user.email}`);
    } catch (emailError) {
      console.error('❌ Error sending password reset email:', emailError);
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
      console.log(`✅ Password reset confirmation email sent to: ${user.email}`);
    } catch (emailError) {
      console.error('❌ Error sending password reset confirmation email:', emailError);
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
      console.log(`✅ Admin activation email sent to: ${user.email}`);
    } catch (emailError) {
      console.error('❌ Error sending admin activation email:', emailError);
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
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
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
