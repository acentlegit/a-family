const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  family: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Family', 
    required: true 
  },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  content: { 
    type: String, 
    required: true 
  },
  excerpt: { 
    type: String,
    maxlength: 500
  },
  featuredImage: { 
    type: String 
  },
  tags: [{ 
    type: String,
    trim: true
  }],
  isPublished: { 
    type: Boolean, 
    default: false 
  },
  publishedAt: { 
    type: Date 
  },
  views: { 
    type: Number, 
    default: 0 
  },
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  comments: [{
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    text: { 
      type: String, 
      required: true 
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for faster queries
blogPostSchema.index({ family: 1, isPublished: 1, createdAt: -1 });
blogPostSchema.index({ author: 1 });
blogPostSchema.index({ tags: 1 });

// Update updatedAt before saving
blogPostSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('BlogPost', blogPostSchema);
