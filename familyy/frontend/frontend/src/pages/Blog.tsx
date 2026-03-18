import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../config/api';
import { colors } from '../styles/colors';
import { FaPlus, FaEdit, FaTrash, FaHeart, FaComment, FaTimes, FaCheckCircle } from 'react-icons/fa';

interface BlogPost {
  _id: string;
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  tags?: string[];
  author: {
    _id: string;
    firstName: string;
    lastName?: string;
    avatar?: string;
  };
  isPublished: boolean;
  publishedAt?: string;
  views: number;
  likes: string[];
  comments: Array<{
    _id: string;
    user: {
      _id: string;
      firstName: string;
      lastName?: string;
      avatar?: string;
    };
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
}

const Blog: React.FC = () => {
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'published' | 'drafts'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    excerpt: '',
    featuredImage: '',
    tags: [] as string[],
    isPublished: false
  });

  useEffect(() => {
    loadFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      loadPosts();
    }
  }, [selectedFamilyId, viewMode]);

  const loadFamilies = async () => {
    try {
      const response = await api.get('/families');
      setFamilies(response.data.data || []);
      if (response.data.data && response.data.data.length > 0) {
        setSelectedFamilyId(response.data.data[0]._id);
      }
    } catch (error) {
      console.error('Error loading families:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    if (!selectedFamilyId) return;
    
    setLoading(true);
    try {
      const published = viewMode === 'published' ? 'true' : viewMode === 'drafts' ? 'false' : undefined;
      const response = await api.get(`/blog/${selectedFamilyId}`, {
        params: { published }
      });
      setPosts(response.data.data || []);
    } catch (error) {
      console.error('Error loading blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!selectedFamilyId) return;
    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post(`/blog/${selectedFamilyId}`, newPost);
      if (response.data.success) {
        setShowCreateModal(false);
        setNewPost({
          title: '',
          content: '',
          excerpt: '',
          featuredImage: '',
          tags: [],
          isPublished: false
        });
        loadPosts();
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      alert(error.response?.data?.error || 'Failed to create post');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePost = async () => {
    if (!selectedPost) return;

    setSaving(true);
    try {
      const response = await api.put(`/blog/post/${selectedPost._id}`, {
        title: selectedPost.title,
        content: selectedPost.content,
        excerpt: selectedPost.excerpt,
        featuredImage: selectedPost.featuredImage,
        tags: selectedPost.tags,
        isPublished: selectedPost.isPublished
      });
      if (response.data.success) {
        setShowEditModal(false);
        setSelectedPost(null);
        loadPosts();
      }
    } catch (error: any) {
      console.error('Error updating post:', error);
      alert(error.response?.data?.error || 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await api.delete(`/blog/post/${postId}`);
      if (response.data.success) {
        loadPosts();
      }
    } catch (error: any) {
      console.error('Error deleting post:', error);
      alert(error.response?.data?.error || 'Failed to delete post');
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await api.post(`/blog/post/${postId}/like`);
      loadPosts();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!text.trim()) return;

    try {
      await api.post(`/blog/post/${postId}/comment`, { text });
      loadPosts();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (loading && !selectedFamilyId) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Loading...</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', color: 'white', marginBottom: '8px' }}>
            Family Blog
          </h1>
          <p style={{ color: 'white' }}>
            Share stories, updates, and messages with your family
          </p>
        </div>

        {families.length > 0 && (
          <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: colors.body }}>
                Select Family
              </label>
              <select
                value={selectedFamilyId}
                onChange={(e) => setSelectedFamilyId(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  fontSize: '15px',
                  minWidth: '300px',
                  background: colors.cardBg,
                  color: colors.body
                }}
              >
                {families.map((family) => (
                  <option key={family._id} value={family._id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: '28px' }}>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '12px 24px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '15px',
                  fontWeight: 600
                }}
              >
                <FaPlus /> New Post
              </button>
            </div>
          </div>
        )}

        {selectedFamilyId && (
          <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setViewMode('all')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'all' ? colors.primary : colors.sectionBg,
                color: viewMode === 'all' ? 'white' : colors.body,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: viewMode === 'all' ? 600 : 400
              }}
            >
              All Posts
            </button>
            <button
              onClick={() => setViewMode('published')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'published' ? colors.primary : colors.sectionBg,
                color: viewMode === 'published' ? 'white' : colors.body,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: viewMode === 'published' ? 600 : 400
              }}
            >
              Published
            </button>
            <button
              onClick={() => setViewMode('drafts')}
              style={{
                padding: '8px 16px',
                background: viewMode === 'drafts' ? colors.primary : colors.sectionBg,
                color: viewMode === 'drafts' ? 'white' : colors.body,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: viewMode === 'drafts' ? 600 : 400
              }}
            >
              Drafts
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            background: colors.cardBg,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <p style={{ color: colors.muted }}>No blog posts found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {posts.map((post) => (
              <div
                key={post._id}
                style={{
                  background: colors.cardBg,
                  borderRadius: '12px',
                  padding: '24px',
                  border: `1px solid ${colors.border}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ 
                      margin: 0, 
                      fontSize: '24px', 
                      color: colors.title,
                      marginBottom: '8px'
                    }}>
                      {post.title}
                    </h2>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ color: colors.muted, fontSize: '14px' }}>
                        By {post.author.firstName} {post.author.lastName || ''}
                      </span>
                      <span style={{ color: colors.muted, fontSize: '14px' }}>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                      {post.isPublished && (
                        <span style={{
                          padding: '4px 8px',
                          background: '#d1fae5',
                          color: '#065f46',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          Published
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setSelectedPost({ ...post });
                        setShowEditModal(true);
                      }}
                      style={{
                        padding: '8px 12px',
                        background: colors.primary,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px'
                      }}
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() => handleDeletePost(post._id)}
                      style={{
                        padding: '8px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px'
                      }}
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>

                {post.excerpt && (
                  <p style={{ 
                    color: colors.muted, 
                    fontSize: '15px',
                    marginBottom: '16px',
                    lineHeight: '1.6'
                  }}>
                    {post.excerpt}
                  </p>
                )}

                <div style={{
                  padding: '16px',
                  background: colors.sectionBg,
                  borderRadius: '8px',
                  marginBottom: '16px',
                  color: colors.body,
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {post.content}
                </div>

                {post.tags && post.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {post.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '4px 12px',
                          background: colors.primary,
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
                  <button
                    onClick={() => handleLike(post._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'none',
                      border: 'none',
                      color: colors.body,
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '4px 8px'
                    }}
                  >
                    <FaHeart style={{ color: post.likes.length > 0 ? '#ef4444' : colors.muted }} />
                    {post.likes.length} {post.likes.length === 1 ? 'Like' : 'Likes'}
                  </button>
                  <span style={{ color: colors.muted, fontSize: '14px' }}>
                    <FaComment style={{ marginRight: '6px' }} />
                    {post.comments.length} {post.comments.length === 1 ? 'Comment' : 'Comments'}
                  </span>
                  <span style={{ color: colors.muted, fontSize: '14px' }}>
                    {post.views} {post.views === 1 ? 'view' : 'views'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Post Modal */}
        {showCreateModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: colors.cardBg,
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '24px', color: colors.title }}>
                Create New Blog Post
              </h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: colors.body }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="Enter post title"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `2px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    background: colors.sectionBg,
                    color: colors.body
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: colors.body }}>
                  Content *
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Write your post content..."
                  style={{
                    width: '100%',
                    minHeight: '300px',
                    padding: '12px',
                    border: `2px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    lineHeight: '1.6',
                    resize: 'vertical',
                    background: colors.sectionBg,
                    color: colors.body
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: colors.body }}>
                  Excerpt (optional)
                </label>
                <textarea
                  value={newPost.excerpt}
                  onChange={(e) => setNewPost({ ...newPost, excerpt: e.target.value })}
                  placeholder="Brief summary of the post..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    border: `2px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    background: colors.sectionBg,
                    color: colors.body
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newPost.isPublished}
                    onChange={(e) => setNewPost({ ...newPost, isPublished: e.target.checked })}
                  />
                  <span style={{ color: colors.body, fontWeight: 500 }}>Publish immediately</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPost({
                      title: '',
                      content: '',
                      excerpt: '',
                      featuredImage: '',
                      tags: [],
                      isPublished: false
                    });
                  }}
                  style={{
                    padding: '12px 24px',
                    background: colors.muted,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={saving || !newPost.title.trim() || !newPost.content.trim()}
                  style={{
                    padding: '12px 24px',
                    background: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                    fontWeight: 600,
                    opacity: saving ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FaCheckCircle /> {saving ? 'Creating...' : 'Create Post'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Post Modal */}
        {showEditModal && selectedPost && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: colors.cardBg,
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '24px', color: colors.title }}>
                Edit Blog Post
              </h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: colors.body }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={selectedPost.title}
                  onChange={(e) => setSelectedPost({ ...selectedPost, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `2px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    background: colors.sectionBg,
                    color: colors.body
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: colors.body }}>
                  Content *
                </label>
                <textarea
                  value={selectedPost.content}
                  onChange={(e) => setSelectedPost({ ...selectedPost, content: e.target.value })}
                  style={{
                    width: '100%',
                    minHeight: '300px',
                    padding: '12px',
                    border: `2px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    lineHeight: '1.6',
                    resize: 'vertical',
                    background: colors.sectionBg,
                    color: colors.body
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: colors.body }}>
                  Excerpt
                </label>
                <textarea
                  value={selectedPost.excerpt || ''}
                  onChange={(e) => setSelectedPost({ ...selectedPost, excerpt: e.target.value })}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    border: `2px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    background: colors.sectionBg,
                    color: colors.body
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedPost.isPublished}
                    onChange={(e) => setSelectedPost({ ...selectedPost, isPublished: e.target.checked })}
                  />
                  <span style={{ color: colors.body, fontWeight: 500 }}>Published</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedPost(null);
                  }}
                  style={{
                    padding: '12px 24px',
                    background: colors.muted,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePost}
                  disabled={saving || !selectedPost.title.trim() || !selectedPost.content.trim()}
                  style={{
                    padding: '12px 24px',
                    background: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                    fontWeight: 600,
                    opacity: saving ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FaCheckCircle /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Blog;
