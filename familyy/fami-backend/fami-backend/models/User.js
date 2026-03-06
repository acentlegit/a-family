const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  // RBAC: Role-Based Access Control
  role: { 
    type: String, 
    enum: ['USER', 'ADMIN', 'SUPER_ADMIN'], 
    default: 'USER',
    required: true
  },
  // Admin invitation system
  inviteToken: String,
  inviteTokenExpire: Date,
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  avatar: { type: String, default: '' },
  phone: { type: String },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  hobbies: { type: String },
  occupation: { type: String },
  bio: { type: String },
  address: { type: String },
  city: { type: String },
  country: { type: String },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    eventReminders: { type: Boolean, default: true },
    newMemories: { type: Boolean, default: true }
  },
  privacy: {
    profileVisibility: { type: String, enum: ['everyone', 'family', 'private'], default: 'everyone' }
  },
  googleDriveTokens: {
    access_token: String,
    refresh_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number
  },
  googleDrivePasscode: {
    type: String,
    default: function() {
      return Math.floor(1000 + Math.random() * 9000).toString();
    }
  },
  googleDriveRootFolderId: String,
  // Deprecated: Use role field instead
  isSuperAdmin: { type: Boolean, default: false },
  // Refresh token for JWT rotation
  refreshToken: String,
  refreshTokenExpire: Date,
  // User's own S3 configuration (optional)
  s3Config: {
    accessKeyId: String,
    secretAccessKey: String,
    bucket: String,
    region: { type: String, default: 'us-east-1' },
    enabled: { type: Boolean, default: false }
  },
  // Last login tracking
  lastLogin: Date,
  // Active family for family switching feature
  activeFamilyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Helper methods for role checking
userSchema.methods.isUser = function() {
  return this.role === 'USER';
};

userSchema.methods.isAdmin = function() {
  return this.role === 'ADMIN' || this.role === 'SUPER_ADMIN';
};

userSchema.methods.checkIsSuperAdmin = function() {
  return this.role === 'SUPER_ADMIN' || this.isSuperAdmin === true;
};

module.exports = mongoose.model('User', userSchema);
