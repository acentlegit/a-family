const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://107.20.87.206:3000',
        'http://107.20.87.206:5000',
        'http://localhost:3000',
        'http://localhost:5000',
        process.env.CLIENT_URL,
        'https://www.arakala.net',
        'http://www.arakala.net',
        'https://arakala.net',
        'http://arakala.net',
        'http://fami-live.s3-website-us-east-1.amazonaws.com',
        'https://fami-live.s3-website-us-east-1.amazonaws.com',
        'https://www.fami.live',
        'http://www.fami.live',
        'https://fami.live',
        'http://fami.live'
      ].filter(Boolean);
      
      // Allow any CloudFront domain (for HTTPS support)
      const isCloudFront = origin.includes('.cloudfront.net');
      const isS3 = origin.includes('s3-website') || origin.includes('amazonaws.com');
      const isFamiDomain = origin.includes('fami.live');
      const isArakalaDomain = origin.includes('arakala.net');
      
      if (allowedOrigins.indexOf(origin) !== -1 || isCloudFront || isS3 || isFamiDomain || isArakalaDomain) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://107.20.87.206:3000',
      'http://107.20.87.206:5000',
      process.env.CLIENT_URL,
      'https://www.arakala.net',
      'http://www.arakala.net',
      'https://arakala.net',
      'http://arakala.net',
      'http://fami-live.s3-website-us-east-1.amazonaws.com',
      'https://fami-live.s3-website-us-east-1.amazonaws.com',
      'https://www.fami.live',
      'http://www.fami.live',
      'https://fami.live',
      'http://fami.live'
    ].filter(Boolean); // Remove undefined values
    
    // Allow any CloudFront domain (for HTTPS support)
    const isCloudFront = origin.includes('.cloudfront.net');
    const isS3 = origin.includes('s3-website') || origin.includes('amazonaws.com');
    const isFamiDomain = origin.includes('fami.live');
    const isArakalaDomain = origin.includes('arakala.net');
    
    // Allow localhost in development
    const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
    
    if (allowedOrigins.indexOf(origin) !== -1 || isCloudFront || isS3 || isFamiDomain || isArakalaDomain || isLocalhost || !origin) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Handle preflight OPTIONS requests explicitly
app.options('*', cors(corsOptions));

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (with proper headers)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Allow CORS for uploaded files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// Serve preview files from generated_sites directory
// This must be before API routes to avoid conflicts
const generatedSitesPath = path.join(__dirname, 'generated_sites');

// Handle preview subdirectories - serve index.html for any subdirectory request
// This must be BEFORE the static middleware to catch subdirectory requests
app.get('/preview/:folder/*', (req, res, next) => {
  const folder = req.params.folder;
  const subPath = req.params[0] || '';
  const fullPath = path.join(generatedSitesPath, folder, subPath);
  
  // If it's a directory, serve index.html
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    const indexFile = path.join(fullPath, 'index.html');
    if (fs.existsSync(indexFile)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(indexFile);
    }
  }
  
  // If it's a file, serve it
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(fullPath);
  }
  
  next(); // Let express.static handle it
});

app.use('/preview', express.static(generatedSitesPath, {
  index: 'index.html',
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    // Allow CORS for preview files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    // Don't cache preview files (they change frequently)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://107.20.87.206:27017/fami';
console.log('🔌 Connecting to MongoDB...');
console.log('📍 Connection string:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials if present

// Connect to MongoDB - with connection state tracking
let isMongoConnected = false;
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    
    isMongoConnected = true;
    console.log('✅ MongoDB Connected');
    console.log(`📊 Database: ${conn.connection.db.databaseName}`);
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`🔌 Port: ${conn.connection.port}`);
    return conn;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.error('Full error:', err);
    console.log('⚠️  Server will continue but database features may not work');
    console.log('💡 To fix:');
    console.log('   1. Ensure MongoDB is running: net start MongoDB (Windows)');
    console.log('   2. Check connection string in server/.env');
    console.log('   3. Verify MongoDB is accessible on port 27017');
    isMongoConnected = false;
    throw err;
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  isMongoConnected = true;
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  isMongoConnected = false;
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  isMongoConnected = false;
  console.log('⚠️  Mongoose disconnected from MongoDB');
});

// Helper function to check if MongoDB is ready
const isMongoReady = () => {
  return mongoose.connection.readyState === 1 && isMongoConnected;
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-family', (familyId) => {
    socket.join(familyId);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Initialize RBAC permissions on server start
const { initializePermissions } = require('./middleware/rbac');

mongoose.connection.once('open', async () => {
  try {
    await initializePermissions();
    
    // Ensure Super Admin always exists with correct credentials (run in background)
    setImmediate(async () => {
      try {
        const User = require('./models/User');
        const SUPER_ADMIN_EMAIL = 'chandra@acentle.com';
        const SUPER_ADMIN_PASSWORD = 'Admin$478';
        
        // Remove super admin from other users
        await User.updateMany(
          { 
            email: { $ne: SUPER_ADMIN_EMAIL.toLowerCase() },
            $or: [
              { role: 'SUPER_ADMIN' },
              { isSuperAdmin: true }
            ]
          },
          {
            $set: {
              role: 'USER',
              isSuperAdmin: false
            }
          }
        );
        
        // Ensure super admin exists
        let superAdmin = await User.findOne({ email: SUPER_ADMIN_EMAIL.toLowerCase() });
        if (!superAdmin) {
          superAdmin = await User.create({
            email: SUPER_ADMIN_EMAIL.toLowerCase(),
            password: SUPER_ADMIN_PASSWORD,
            firstName: 'Chandra',
            lastName: 'Admin',
            role: 'SUPER_ADMIN',
            isSuperAdmin: true,
            isVerified: true
          });
          console.log('✅ Super Admin user created on startup');
        } else {
          // Update to ensure correct credentials
          superAdmin.password = SUPER_ADMIN_PASSWORD;
          superAdmin.role = 'SUPER_ADMIN';
          superAdmin.isSuperAdmin = true;
          superAdmin.isVerified = true;
          
          // Fix gender field if it's invalid (enum requires 'Male', 'Female', or 'Other')
          if (superAdmin.gender && !['Male', 'Female', 'Other'].includes(superAdmin.gender)) {
            const genderMap = { 'male': 'Male', 'female': 'Female', 'other': 'Other' };
            superAdmin.gender = genderMap[superAdmin.gender.toLowerCase()] || undefined;
          }
          
          superAdmin.markModified('password');
          await superAdmin.save();
          console.log('✅ Super Admin credentials verified on startup');
        }
      } catch (error) {
        console.error('⚠️  Error ensuring super admin on startup:', error.message);
      }
    });
  } catch (error) {
    console.error('Error initializing RBAC permissions:', error);
  }
});

// Apply rate limiting to auth routes
const { authLimiter, passwordResetLimiter, apiLimiter } = require('./middleware/rateLimiter');
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/auth/accept-invite', authLimiter);

// Apply general API rate limiting
app.use('/api', apiLimiter);

// Serve preview static files
app.use('/preview', express.static(path.join(__dirname, 'generated_sites')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/families', require('./routes/families'));
app.use('/api/members', require('./routes/members'));
app.use('/api/family-tree', require('./routes/familyTree'));
app.use('/api/memories', require('./routes/memories'));
app.use('/api/media', require('./routes/media'));
app.use('/api/events', require('./routes/events'));
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/video-calls', require('./routes/videoCalls'));
// LiveKit routes
try {
  const livekitRouter = require('./routes/livekit');
  app.use('/api/livekit', livekitRouter);
  console.log('✅ LiveKit routes registered successfully');
} catch (error) {
  console.error('❌ Error loading LiveKit routes:', error.message);
  app.use('/api/livekit', (req, res) => {
    res.status(500).json({ 
      success: false, 
      error: 'LiveKit routes failed to load. Please restart the server.',
      details: error.message 
    });
  });
}
// Video session routes
try {
  const videoRouter = require('./routes/video');
  app.use('/api/video', videoRouter);
  console.log('✅ Video session routes registered successfully');
} catch (error) {
  console.error('❌ Error loading video routes:', error.message);
  app.use('/api/video', (req, res) => {
    res.status(500).json({ 
      success: false, 
      error: 'Video routes failed to load. Please restart the server.',
      details: error.message 
    });
  });
}
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/email', require('./routes/email'));
app.use('/api/albums', require('./routes/albums'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/google-drive', require('./routes/googleDrive'));
app.use('/api/s3-to-drive', require('./routes/s3ToDrive'));
app.use('/api/super-admin', require('./routes/superAdmin'));

// Website Admin routes - register with error handling
try {
  const websiteAdminRouter = require('./routes/websiteAdmin');
  app.use('/api/website-admin', websiteAdminRouter);
  console.log('✅ Website admin routes registered successfully');
} catch (error) {
  console.error('❌ Error loading website admin routes:', error.message);
  console.error('❌ Stack:', error.stack);
  // Register a placeholder route to prevent 404s
  app.use('/api/website-admin', (req, res) => {
    res.status(500).json({ 
      success: false, 
      error: 'Website admin routes failed to load. Please restart the server.',
      details: error.message 
    });
  });
}

// Health check route
app.get('/api/health', (req, res) => {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  
  res.json({ 
    success: true,
    status: 'OK', 
    message: 'API is running',
    timestamp: new Date().toISOString(),
    mongodb: states[readyState] || 'Unknown',
    mongodbState: readyState,
    mongodbUri: process.env.MONGODB_URI ? 'Set' : 'Not set'
  });
});

// Serve React frontend (production) - only if build folder exists
// In development, frontend runs separately on port 3001
const frontendPath = path.join(__dirname, '../client/build');

if (fs.existsSync(frontendPath) && fs.existsSync(path.join(frontendPath, 'index.html'))) {
  console.log('✅ Serving frontend from:', frontendPath);
  app.use(express.static(frontendPath, {
    maxAge: '1d', // Cache static files for 1 day
    etag: true
  }));

  // Handle React Router - send all non-API requests to index.html
  // This MUST be last, after all API routes
  app.get('*', (req, res) => {
    // Only serve frontend if it's not an API route
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
} else {
  console.log('ℹ️  Frontend build not found. Running in API-only mode.');
  console.log('ℹ️  Frontend should be running separately (e.g., on port 3001)');
  
  // In development, frontend is served separately
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.status(200).json({ 
        success: true, 
        message: 'Fami API Server', 
        mode: 'production',
        frontend: 'Served from S3',
        api: 'http://107.20.87.206:5000/api',
        health: 'http://107.20.87.206:5000/api/health'
      });
    }
  });
}

// Handle 404 for unmatched API routes (must be after all route registrations)
app.use('/api/*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.originalUrl, req.path);
  console.log('❌ Available routes:', Object.keys(req.app._router?.stack || {}).length, 'routes registered');
  res.status(404).json({ success: false, message: 'API route not found', path: req.path, method: req.method, originalUrl: req.originalUrl });
});

const PORT = process.env.PORT || 5000;
// For development, use localhost. For production/Docker, use 0.0.0.0
const HOST = process.env.NODE_ENV === 'production' ? (process.env.HOST || '0.0.0.0') : '0.0.0.0';

// Start MongoDB connection first, then start server
(async () => {
  try {
    console.log('⏳ Waiting for MongoDB connection...');
    await connectDB();
    console.log('✅ MongoDB ready, starting server...');
    
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`📡 Accessible from: http://107.20.87.206:${PORT}`);
      if (HOST === '0.0.0.0') {
        console.log(`📡 Also accessible from: http://107.20.87.206:${PORT}`);
      }
      console.log('✅ All services ready!');
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB, starting server anyway...');
    console.error('⚠️  Database features will not work until MongoDB is connected');
    console.error('💡 The server will retry connection automatically');
    
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`📡 Accessible from: http://107.20.87.206:${PORT}`);
      if (HOST === '0.0.0.0') {
        console.log(`📡 Also accessible from: http://107.20.87.206:${PORT}`);
      }
      console.log('⚠️  Waiting for MongoDB connection...');
    });
    
    // Retry connection in background
    setTimeout(async () => {
      try {
        await connectDB();
        console.log('✅ MongoDB connected successfully!');
      } catch (retryErr) {
        console.error('❌ MongoDB retry failed:', retryErr.message);
      }
    }, 5000);
  }
})();
