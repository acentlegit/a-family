const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const Family = require('../models/Family');
const { protect } = require('../middleware/auth');

/**
 * GET /api/blog/:familyId
 * Get all blog posts for a family (published and unpublished)
 */
router.get('/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { published, limit = 50, skip = 0 } = req.query;
    
    const query = { family: familyId };
    
    // Filter by published status if specified
    if (published === 'true') {
      query.isPublished = true;
    } else if (published === 'false') {
      query.isPublished = false;
    }
    
    const posts = await BlogPost.find(query)
      .populate('author', 'firstName lastName avatar')
      .populate('comments.user', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await BlogPost.countDocuments(query);
    
    res.json({ 
      success: true, 
      count: posts.length,
      total,
      data: posts 
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/blog/:familyId/published
 * Get only published blog posts (for public website)
 */
router.get('/:familyId/published', async (req, res) => {
  try {
    const { familyId } = req.params;
    const { limit = 20, skip = 0 } = req.query;
    
    const posts = await BlogPost.find({ 
      family: familyId, 
      isPublished: true 
    })
      .populate('author', 'firstName lastName avatar')
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    res.json({ 
      success: true, 
      count: posts.length,
      data: posts 
    });
  } catch (error) {
    console.error('Error fetching published blog posts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/blog/post/:postId
 * Get a specific blog post
 */
router.get('/post/:postId', protect, async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await BlogPost.findById(postId)
      .populate('author', 'firstName lastName avatar')
      .populate('comments.user', 'firstName lastName avatar')
      .populate('likes', 'firstName lastName');
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Blog post not found' 
      });
    }
    
    // Increment views
    post.views += 1;
    await post.save();
    
    res.json({ 
      success: true, 
      data: post 
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/blog/:familyId
 * Create a new blog post
 */
router.post('/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { title, content, excerpt, featuredImage, tags, isPublished } = req.body;
    
    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title is required' 
      });
    }
    
    if (!content || !content.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Content is required' 
      });
    }
    
    // Auto-generate excerpt if not provided
    const autoExcerpt = excerpt || content.substring(0, 200).replace(/\n/g, ' ').trim() + '...';
    
    const post = await BlogPost.create({
      family: familyId,
      author: req.user._id,
      title: title.trim(),
      content: content.trim(),
      excerpt: autoExcerpt,
      featuredImage: featuredImage || '',
      tags: tags && Array.isArray(tags) ? tags : [],
      isPublished: isPublished || false
    });
    
    const populatedPost = await BlogPost.findById(post._id)
      .populate('author', 'firstName lastName avatar');
    
    res.status(201).json({ 
      success: true, 
      data: populatedPost 
    });
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * PUT /api/blog/post/:postId
 * Update a blog post
 */
router.put('/post/:postId', protect, async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content, excerpt, featuredImage, tags, isPublished } = req.body;
    
    const post = await BlogPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Blog post not found' 
      });
    }
    
    // Check if user is the author
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to update this post' 
      });
    }
    
    // Update fields
    if (title !== undefined) post.title = title.trim();
    if (content !== undefined) post.content = content.trim();
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (featuredImage !== undefined) post.featuredImage = featuredImage;
    if (tags !== undefined) post.tags = Array.isArray(tags) ? tags : [];
    if (isPublished !== undefined) {
      post.isPublished = isPublished;
      if (isPublished && !post.publishedAt) {
        post.publishedAt = Date.now();
      }
    }
    
    await post.save();
    
    const populatedPost = await BlogPost.findById(post._id)
      .populate('author', 'firstName lastName avatar')
      .populate('comments.user', 'firstName lastName avatar');
    
    res.json({ 
      success: true, 
      data: populatedPost 
    });
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/blog/post/:postId
 * Delete a blog post
 */
router.delete('/post/:postId', protect, async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await BlogPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Blog post not found' 
      });
    }
    
    // Check if user is the author
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to delete this post' 
      });
    }
    
    await post.deleteOne();
    
    res.json({ 
      success: true, 
      message: 'Blog post deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/blog/post/:postId/like
 * Like/Unlike a blog post
 */
router.post('/post/:postId/like', protect, async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await BlogPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Blog post not found' 
      });
    }
    
    const likeIndex = post.likes.indexOf(req.user._id);
    
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(req.user._id);
    }
    
    await post.save();
    
    const populatedPost = await BlogPost.findById(post._id)
      .populate('likes', 'firstName lastName');
    
    res.json({ 
      success: true, 
      data: populatedPost 
    });
  } catch (error) {
    console.error('Error liking blog post:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/blog/post/:postId/comment
 * Add a comment to a blog post
 */
router.post('/post/:postId/comment', protect, async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Comment text is required' 
      });
    }
    
    const post = await BlogPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Blog post not found' 
      });
    }
    
    post.comments.push({
      user: req.user._id,
      text: text.trim()
    });
    
    await post.save();
    
    const populatedPost = await BlogPost.findById(post._id)
      .populate('author', 'firstName lastName avatar')
      .populate('comments.user', 'firstName lastName avatar');
    
    res.json({ 
      success: true, 
      data: populatedPost 
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
