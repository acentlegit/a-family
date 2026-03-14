const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);


const helmet = require('helmet');
// Configure helmet to allow images from uploads directory
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:", "http:", "blob:"],
    },
  },
}));

const rateLimit = require('express-rate-limit');

/*
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
*/

/* =========================
   ENV CONFIG
========================= */

const PORT = process.env.PORT || 5000;
const BASE_URL =
  process.env.BASE_URL || "https://api.arakala.net";

// MongoDB URI - REQUIRED in production
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI && process.env.NODE_ENV === "production") {
  console.error("❌ MONGODB_URI environment variable is required in production!");
  process.exit(1);
}
const MONGODB_URI_FINAL = MONGODB_URI || "mongodb://localhost:27017/fami"; // Only for development

/* =========================
   CLEAN PRODUCTION CORS
========================= */

// Get allowed origins from environment - REQUIRED in production
const CLIENT_URL = process.env.CLIENT_URL;
const S3_BUCKET_URL = process.env.S3_BUCKET_URL || "";

if (!CLIENT_URL && process.env.NODE_ENV === "production") {
  console.error("❌ CLIENT_URL environment variable is required in production!");
  process.exit(1);
}

const allowedOrigins = [
  "https://www.fami.live",
  "https://fami.live",
  "http://fami.live",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  CLIENT_URL,
  S3_BUCKET_URL
].filter(Boolean); // Remove empty strings

/* =========================
   CORS MIDDLEWARE - Handle OPTIONS FIRST (before everything else)
========================= */
// Handle ALL OPTIONS requests FIRST - must be before any other middleware
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    
    // Always set CORS headers for OPTIONS preflight requests
    if (origin) {
      // In development, allow localhost origins
      if (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (process.env.NODE_ENV === 'production') {
        // In production, reject unknown origins
        return res.status(403).json({ success: false, message: 'Origin not allowed' });
      } else {
        // In development, allow any origin
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }
  next();
});

/* =========================
   HANDLE STATIC FILE REQUESTS - Must be before CORS middleware
========================= */
// Handle OPTIONS requests for static files FIRST - catch all /uploads paths including subdirectories
app.options('/uploads*', (req, res) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Accept-Ranges');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Middleware to set CORS headers for all /uploads requests
// This MUST be before express.static to ensure headers are set
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  
  // Always allow CORS for static files (images) - use wildcard for images
  // When using wildcard, credentials must be false
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', origin ? 'true' : 'false'); // false when using wildcard
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Accept-Ranges, Content-Disposition');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Remove any blocking headers that Helmet might have set
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Apply CORS middleware for all other requests
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or direct requests)
    if (!origin) {
      return callback(null, true);
    }

    // In development, allow localhost origins
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
    }

    // Allow requests from allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log("❌ CORS blocked:", origin);
    // In development, still allow but log warning
    if (process.env.NODE_ENV !== 'production') {
      console.log("⚠️  Allowing in development mode");
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   ROUTES - Register after CORS middleware
========================= */
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

/* =========================
   SOCKET.IO
========================= */

const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("join-family", (familyId) => {
    socket.join(familyId);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

app.set("io", io);

/* =========================
   STATIC FILES
========================= */

// Serve static files with proper CORS headers
// This serves all files in uploads directory including subdirectories like website-logos
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath, stat) => {
      // Get the origin from the request (set by middleware above)
      // If not set, use wildcard to allow all origins
      let origin = res.getHeader('Access-Control-Allow-Origin');
      if (!origin) {
        // Try to get from request if available
        origin = '*';
      }
      
      // Always set CORS headers for static files (images)
      // Allow any origin for static files to prevent CORS errors
      res.setHeader("Access-Control-Allow-Origin", origin === '*' ? '*' : origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Expose-Headers", "Content-Type, Content-Length, Accept-Ranges");
      res.setHeader("Cache-Control", "public, max-age=31536000");
      
      // Set proper content type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') {
        res.setHeader("Content-Type", "image/jpeg");
      } else if (ext === '.png') {
        res.setHeader("Content-Type", "image/png");
      } else if (ext === '.gif') {
        res.setHeader("Content-Type", "image/gif");
      } else if (ext === '.svg') {
        res.setHeader("Content-Type", "image/svg+xml");
      } else if (ext === '.webp') {
        res.setHeader("Content-Type", "image/webp");
      }
    },
    // Enable serving files from subdirectories
    dotfiles: 'ignore',
    index: false
  })
);

// Serve preview static files (generated websites)
const generatedSitesPath = path.join(__dirname, "generated_sites");
app.use("/preview", express.static(generatedSitesPath, {
  setHeaders: (res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
  }
}));

/* =========================
   DATABASE
========================= */

mongoose
  .connect(MONGODB_URI_FINAL, {
    serverSelectionTimeoutMS: 10000
  })
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
  });

/* =========================
   ROUTES
========================= */

app.use("/api/auth", require("./routes/auth"));
app.use("/api/families", require("./routes/families"));
app.use("/api/members", require("./routes/members"));
app.use("/api/family-tree", require("./routes/familyTree"));
app.use("/api/memories", require("./routes/memories"));
app.use("/api/media", require("./routes/media"));
app.use("/api/events", require("./routes/events"));
app.use("/api/invitations", require("./routes/invitations"));
app.use("/api/roles", require("./routes/roles"));
app.use("/api/video-calls", require("./routes/videoCalls"));
app.use("/api/livekit", require("./routes/livekit"));
app.use("/api/video", require("./routes/video"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/email", require("./routes/email"));
app.use("/api/albums", require("./routes/albums"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/google-drive", require("./routes/googleDrive"));
app.use("/api/s3-to-drive", require("./routes/s3ToDrive"));
app.use("/api/super-admin", require("./routes/superAdmin"));
app.use("/api/website-admin", require("./routes/websiteAdmin"));
app.use("/api/bios", require("./routes/bios"));
app.use("/api/blog", require("./routes/blog"));

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Not Connected"
  });
});

/* =========================
   API ROOT (NO IP LEAK)
========================= */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fami API Server",
    mode: process.env.NODE_ENV || "development",
    frontend: "Served from S3",
    api: `${BASE_URL}/api`,
    health: `${BASE_URL}/api/health`
  });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err);
  
  // Don't send error response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Determine status code
  const statusCode = err.status || err.statusCode || 500;
  
  // Prepare error response
  const errorResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message || 'An error occurred',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  };
  
  res.status(statusCode).json(errorResponse);
});

/* =========================
   404 HANDLER
========================= */

app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

/* =========================
   UNHANDLED REJECTION & EXCEPTION HANDLERS
========================= */

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // In production, you might want to log to a service like Sentry
  // For now, we'll just log and continue
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Graceful shutdown
  process.exit(1);
});

/* =========================
   START SERVER
========================= */

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API running on port ${PORT}`);
});
