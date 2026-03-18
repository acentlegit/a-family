import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import api, { getApiUrl } from '../config/api';
import { FaPlus, FaHeart, FaComment, FaEdit, FaTrash, FaTimes, FaImages, FaVideo } from 'react-icons/fa';

/**
 * Helper function to fix S3 URLs with invalid format
 * Converts bucket-name.s3.region.amazonaws.com to s3.region.amazonaws.com/bucket-name
 * Note: Presigned URLs (with query parameters) are returned as-is
 */
const fixS3Url = (url: string): string => {
  if (!url) return url;
  
  // If URL is already a presigned URL (has query parameters), return as-is
  if (url.includes('?') && url.includes('X-Amz-')) {
    return url;
  }
  
  // Check if URL has the problematic format: bucket-name.s3.region.amazonaws.com
  // This happens when bucket name contains dots
  const s3UrlPattern = /https?:\/\/([^/]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+?)(?:\?|$)/;
  const match = url.match(s3UrlPattern);
  
  if (match) {
    const bucketName = match[1];
    const region = match[2];
    const key = match[3];
    
    // If bucket name contains dots, convert to path-style URL
    if (bucketName.includes('.')) {
      return `https://s3.${region}.amazonaws.com/${bucketName}/${key}`;
    }
  }
  
  return url;
};

/**
 * Helper function to construct proper image URL
 * Handles local storage, S3, and Google Drive URLs
 */
const getImageUrl = (item: any): string => {
  if (!item) return '';
  
  const mediaUrl = item.url || '';
  const thumbnailUrl = item.thumbnail || '';
  const filename = item.filename || '';
  
  // If it's already a full URL (http/https), fix S3 URLs if needed
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return fixS3Url(mediaUrl);
  }
  
  // For local storage files, construct full URL
  const apiUrl = getApiUrl();
  const baseUrl = apiUrl.replace('/api', '');
  
  // Handle different path formats
  if (mediaUrl.startsWith('/uploads/')) {
    return `${baseUrl}${mediaUrl}`;
  } else if (mediaUrl.startsWith('uploads/')) {
    return `${baseUrl}/${mediaUrl}`;
  } else if (mediaUrl.startsWith('/')) {
    return `${baseUrl}${mediaUrl}`;
  } else if (filename) {
    // Use filename to construct URL
    return `${baseUrl}/uploads/${filename}`;
  } else if (mediaUrl) {
    // Just a filename or relative path
    return `${baseUrl}/uploads/${mediaUrl}`;
  }
  
  // Fallback to thumbnail if available
  if (thumbnailUrl) {
    if (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')) {
      return fixS3Url(thumbnailUrl);
    }
    if (thumbnailUrl.startsWith('/uploads/')) {
      return `${baseUrl}${thumbnailUrl}`;
    }
    if (thumbnailUrl.startsWith('uploads/')) {
      return `${baseUrl}/${thumbnailUrl}`;
    }
    return `${baseUrl}/uploads/${thumbnailUrl}`;
  }
  
  return '';
};

const Memories: React.FC = () => {
  const [memories, setMemories] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  const [newMemory, setNewMemory] = useState({
    title: '',
    description: '',
    location: '',
    tags: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [commentText, setCommentText] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchMemories();
    }
  }, [selectedFamilyId]);

  const fetchFamilies = async () => {
    try {
      const response = await api.get('/families');
      setFamilies(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedFamilyId(response.data.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemories = async () => {
    if (!selectedFamilyId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/memories/${selectedFamilyId}`);
      const memoriesData = response.data.data || [];
      
      // Fix URLs for all media items using helper function
      const fixedMemories = memoriesData.map((memory: any) => {
        if (memory.media && Array.isArray(memory.media)) {
          memory.media = memory.media.map((mediaItem: any) => {
            const fixedUrl = getImageUrl(mediaItem);
            const fixedThumbnail = mediaItem.thumbnail ? getImageUrl({ ...mediaItem, url: mediaItem.thumbnail }) : fixedUrl;
            
            return {
              ...mediaItem,
              url: fixedUrl || mediaItem.url,
              thumbnail: fixedThumbnail || mediaItem.thumbnail || fixedUrl
            };
          });
        }
        return memory;
      });
      setMemories(fixedMemories);
    } catch (error) {
      console.error('Error fetching memories:', error);
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }

    if (!newMemory.title || !newMemory.title.trim()) {
      alert('Please enter a title for the memory');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', newMemory.title.trim());
      formData.append('description', newMemory.description || '');
      formData.append('location', newMemory.location || '');
      
      // Handle tags - ensure it's a valid JSON string
      const tagsArray = newMemory.tags 
        ? newMemory.tags.split(',').map(t => t.trim()).filter(t => t)
        : [];
      formData.append('tags', JSON.stringify(tagsArray));

      // Append media files if any
      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file) => {
          formData.append('media', file);
        });
      }

      console.log('Creating memory with:', {
        title: newMemory.title,
        description: newMemory.description,
        files: selectedFiles.length
      });

      const response = await api.post(`/memories/${selectedFamilyId}`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        console.log('✅ Memory created successfully:', response.data.data);
        console.log('Memory media:', response.data.data?.media);
        alert('Memory created successfully!');
        setShowCreateModal(false);
        setNewMemory({ title: '', description: '', location: '', tags: '' });
        setSelectedFiles([]);
        // Refetch memories to get the updated list
        await fetchMemories();
      } else {
        throw new Error(response.data.message || 'Failed to create memory');
      }
    } catch (error: any) {
      console.error('Error creating memory:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message || 
                          'Error creating memory. Please try again.';
      alert(`Failed to create memory: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleEditMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemory) return;

    try {
      await api.put(`/memories/${selectedMemory._id}`, {
        title: selectedMemory.title,
        description: selectedMemory.description,
        location: selectedMemory.location,
        tags: selectedMemory.tags
      });

      setShowEditModal(false);
      setSelectedMemory(null);
      fetchMemories();
    } catch (error) {
      console.error('Error updating memory:', error);
      alert('Error updating memory. Please try again.');
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this memory?')) return;

    try {
      await api.delete(`/memories/${memoryId}`);
      fetchMemories();
    } catch (error) {
      console.error('Error deleting memory:', error);
      alert('Error deleting memory. Please try again.');
    }
  };

  const handleLike = async (memoryId: string) => {
    try {
      await api.post(`/memories/${memoryId}/like`);
      fetchMemories();
    } catch (error) {
      console.error('Error liking memory:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemory || !commentText.trim()) return;

    try {
      await api.post(`/memories/${selectedMemory._id}/comment`, { text: commentText });
      setCommentText('');
      fetchMemories();
      // Update selected memory with new comment
      const response = await api.get(`/memories/single/${selectedMemory._id}`);
      setSelectedMemory(response.data.data);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment. Please try again.');
    }
  };

  const openEditModal = (memory: any) => {
    setSelectedMemory(memory);
    setShowEditModal(true);
  };

  const openCommentModal = (memory: any) => {
    setSelectedMemory(memory);
    setShowCommentModal(true);
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <Layout selectedFamily={families.find(f => f._id === selectedFamilyId)}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', color: 'white', margin: '0 0 8px 0', fontWeight: '600' }}>Family Memories</h2>
            <p style={{ color: 'white', margin: 0, opacity: 0.9 }}>Share and cherish special moments</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <FaPlus /> Add Memory
          </button>
        </div>

        {/* Family Selector */}
        <div style={{
          background: colors.cardBg,
          padding: '16px',
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          marginBottom: '24px'
        }}>
          <label style={{ display: 'block', color: colors.body, fontWeight: '600', marginBottom: '8px' }}>
            Select Family
          </label>
          <select
            value={selectedFamilyId}
            onChange={(e) => setSelectedFamilyId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              fontSize: '15px',
              outline: 'none',
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
          {memories.map((memory) => (
            <div
              key={memory._id}
              style={{
                background: '#fff',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              {(() => {
                // Check if memory has valid media with URL
                const hasValidMedia = memory.media && 
                                     Array.isArray(memory.media) && 
                                     memory.media.length > 0 && 
                                     memory.media[0] && 
                                     (memory.media[0].url || memory.media[0].filename);
                
                return hasValidMedia;
              })() ? (
                <div style={{
                  height: '250px',
                  width: '100%',
                  backgroundColor: colors.sectionBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <img
                    src={getImageUrl(memory.media[0])}
                    alt={memory.title || 'Memory photo'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                    onError={(e) => {
                      const img = e.currentTarget;
                      const originalSrc = img.src;
                      const triedUrls = img.dataset.triedUrls ? JSON.parse(img.dataset.triedUrls) : [];
                      
                      // Silently handle errors - no console output
                      // Add current URL to tried list
                      if (!triedUrls.includes(originalSrc)) {
                        triedUrls.push(originalSrc);
                      }
                      
                      // Check if this is a presigned URL
                      const isPresignedUrl = originalSrc.includes('X-Amz-') || originalSrc.includes('AWSAccessKeyId');
                      
                      // For presigned URLs, don't try alternatives - they're unique
                      if (isPresignedUrl) {
                        // Show error immediately for presigned URLs that fail
                        img.style.display = 'none';
                        const parent = img.parentElement;
                        if (parent && !parent.querySelector('.image-error')) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'image-error';
                          errorDiv.style.cssText = 'height: 100%; display: flex; align-items: center; justify-content: center; color: #999; padding: 20px; text-align: center; width: 100%; background: #f5f5f5;';
                          errorDiv.textContent = 'Image not available';
                          parent.appendChild(errorDiv);
                        }
                        return;
                      }
                      
                      // Try alternative URL formats for non-presigned URLs
                      const mediaUrl = memory.media[0]?.url || '';
                      const thumbnailUrl = memory.media[0]?.thumbnail || '';
                      const filename = memory.media[0]?.filename || '';
                      
                      // Try different URL formats
                      const alternatives = [
                        // Try thumbnail if different from main URL
                        thumbnailUrl && thumbnailUrl !== mediaUrl ? getImageUrl({ ...memory.media[0], url: thumbnailUrl }) : null,
                        // Try with different base URL construction
                        filename ? (() => {
                          const apiUrl = getApiUrl();
                          const baseUrl = apiUrl.replace('/api', '');
                          return `${baseUrl}/uploads/${filename}`;
                        })() : null,
                        // Try original URL if it's different
                        mediaUrl && mediaUrl !== originalSrc ? getImageUrl(memory.media[0]) : null
                      ].filter(url => url && !triedUrls.includes(url) && url.trim() !== '');
                      
                      // Find first alternative not yet tried
                      const nextUrl = alternatives.find(url => !triedUrls.includes(url));
                      
                      if (nextUrl) {
                        triedUrls.push(nextUrl);
                        img.dataset.triedUrls = JSON.stringify(triedUrls);
                        img.src = nextUrl;
                      } else {
                        // All alternatives failed, show error message silently
                        img.style.display = 'none';
                        const parent = img.parentElement;
                        if (parent && !parent.querySelector('.image-error')) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'image-error';
                          errorDiv.style.cssText = 'height: 100%; display: flex; align-items: center; justify-content: center; color: #999; padding: 20px; text-align: center; width: 100%; background: #f5f5f5;';
                          errorDiv.textContent = 'Image not available';
                          parent.appendChild(errorDiv);
                        }
                      }
                    }}
                    onLoad={(e) => {
                      // Image loaded successfully - silently remove any error messages
                      // Remove any error messages if image loads
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const errorDiv = parent.querySelector('.image-error');
                        if (errorDiv) {
                          errorDiv.remove();
                        }
                      }
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {memory.media[0].type === 'video' ? '🎥 Video' : '📷 Photo'}
                  </div>
                </div>
              ) : (
                <div style={{
                  height: '250px',
                  background: colors.sectionBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#333'
                }}>
                  No image available
                </div>
              )}

              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600'
                  }}>
                    {memory.createdBy?.firstName?.[0] || 'U'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '15px', color: '#000', margin: '0 0 2px 0', fontWeight: '500' }}>
                      {memory.createdBy?.firstName} {memory.createdBy?.lastName}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                      {new Date(memory.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {memory.createdBy?._id === currentUser._id && (
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => {
                          const menu = document.getElementById(`menu-${memory._id}`);
                          if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '8px'
                        }}
                      >
                        •••
                      </button>
                      <div
                        id={`menu-${memory._id}`}
                        style={{
                          display: 'none',
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          background: colors.cardBg,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          zIndex: 10,
                          minWidth: '150px'
                        }}
                      >
                        <button
                          onClick={() => {
                            openEditModal(memory);
                            const menu = document.getElementById(`menu-${memory._id}`);
                            if (menu) menu.style.display = 'none';
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: colors.body,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteMemory(memory._id);
                            const menu = document.getElementById(`menu-${memory._id}`);
                            if (menu) menu.style.display = 'none';
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: '#DC2626',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: '18px', color: '#000', margin: '0 0 8px 0', fontWeight: '600' }}>
                  {memory.title}
                </h3>
                <p style={{ color: colors.body, fontSize: '14px', margin: '0 0 8px 0' }}>
                  {memory.description}
                </p>
                {memory.location && (
                  <p style={{ color: '#333', fontSize: '13px', margin: '0 0 16px 0' }}>
                    📍 {memory.location}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  gap: '16px',
                  paddingTop: '16px',
                  borderTop: `1px solid ${colors.border}`
                }}>
                  <button
                    onClick={() => handleLike(memory._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: memory.likes?.some((like: any) => like._id === currentUser._id) ? '#DC2626' : colors.body,
                      fontSize: '14px',
                      fontWeight: memory.likes?.some((like: any) => like._id === currentUser._id) ? '600' : '400'
                    }}
                  >
                    <FaHeart color={memory.likes?.some((like: any) => like._id === currentUser._id) ? '#DC2626' : colors.muted} />
                    {memory.likes?.length || 0} {memory.likes?.length === 1 ? 'Like' : 'Likes'}
                  </button>
                  <button
                    onClick={() => openCommentModal(memory)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.body,
                      fontSize: '14px'
                    }}
                  >
                    <FaComment color={colors.primary} />
                    {memory.comments?.length || 0} {memory.comments?.length === 1 ? 'Comment' : 'Comments'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {memories.length === 0 && (
          <div style={{
            background: '#fff',
            padding: '60px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📸</div>
            <h3 style={{ fontSize: '20px', color: '#000', margin: '0 0 8px 0', fontWeight: '600' }}>
              No memories yet
            </h3>
            <p style={{ color: '#333', margin: '0 0 24px 0' }}>
              Start creating beautiful memories with your family
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '12px 24px',
                background: colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Create First Memory
            </button>
          </div>
        )}
      </div>

      {/* Create Memory Modal */}
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
          overflow: 'auto',
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', color: '#000', margin: 0, fontWeight: '600' }}>
                Create New Memory
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewMemory({ title: '', description: '', location: '', tags: '' });
                  setSelectedFiles([]);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                <FaTimes size={20} color={colors.muted} />
              </button>
            </div>

            <form onSubmit={handleCreateMemory}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={newMemory.title}
                  onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
                  required
                  placeholder="Give your memory a title"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Description *
                </label>
                <textarea
                  value={newMemory.description}
                  onChange={(e) => setNewMemory({ ...newMemory, description: e.target.value })}
                  required
                  rows={4}
                  placeholder="Describe this special moment..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Location
                </label>
                <input
                  type="text"
                  value={newMemory.location}
                  onChange={(e) => setNewMemory({ ...newMemory, location: e.target.value })}
                  placeholder="Where was this?"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={newMemory.tags}
                  onChange={(e) => setNewMemory({ ...newMemory, tags: e.target.value })}
                  placeholder="vacation, birthday, reunion"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Photos/Videos
                </label>
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  border: `2px dashed ${colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: colors.sectionBg
                }}>
                  <FaImages size={32} color={colors.muted} style={{ marginBottom: '12px' }} />
                  <span style={{ color: colors.body, fontSize: '14px', marginBottom: '4px' }}>
                    Click to upload photos or videos
                  </span>
                  <span style={{ color: '#666', fontSize: '12px' }}>
                    Supports: JPG, PNG, MP4, MOV (Max 10 files)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </label>
                {selectedFiles.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ color: colors.body, fontSize: '14px', marginBottom: '8px' }}>
                      {selectedFiles.length} file(s) selected:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '6px 12px',
                            background: colors.primarySoft,
                            color: '#000',
                            borderRadius: '6px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {file.type.startsWith('video') ? <FaVideo /> : <FaImages />}
                          {file.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewMemory({ title: '', description: '', location: '', tags: '' });
                    setSelectedFiles([]);
                  }}
                  style={{
                    padding: '12px 24px',
                    background: colors.sectionBg,
                    color: colors.body,
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  style={{
                    padding: '12px 24px',
                    background: uploading ? colors.muted : colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: uploading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploading ? 'Creating...' : 'Create Memory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Memory Modal */}
      {showEditModal && selectedMemory && (
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
          overflow: 'auto',
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', color: '#000', margin: 0, fontWeight: '600' }}>
                Edit Memory
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMemory(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                <FaTimes size={20} color={colors.muted} />
              </button>
            </div>

            <form onSubmit={handleEditMemory}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={selectedMemory.title}
                  onChange={(e) => setSelectedMemory({ ...selectedMemory, title: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Description *
                </label>
                <textarea
                  value={selectedMemory.description}
                  onChange={(e) => setSelectedMemory({ ...selectedMemory, description: e.target.value })}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: colors.body, fontWeight: '500', marginBottom: '8px' }}>
                  Location
                </label>
                <input
                  type="text"
                  value={selectedMemory.location || ''}
                  onChange={(e) => setSelectedMemory({ ...selectedMemory, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMemory(null);
                  }}
                  style={{
                    padding: '12px 24px',
                    background: colors.sectionBg,
                    color: colors.body,
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    background: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showCommentModal && selectedMemory && (
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
          overflow: 'auto',
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', color: '#000', margin: 0, fontWeight: '600' }}>
                Comments
              </h2>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setSelectedMemory(null);
                  setCommentText('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                <FaTimes size={20} color={colors.muted} />
              </button>
            </div>

            {/* Memory Preview */}
            <div style={{
              padding: '16px',
              background: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', color: '#000', margin: '0 0 4px 0', fontWeight: '600' }}>
                {selectedMemory.title}
              </h3>
              <p style={{ fontSize: '14px', color: colors.body, margin: 0 }}>
                {selectedMemory.description}
              </p>
            </div>

            {/* Comments List */}
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              marginBottom: '20px'
            }}>
              {selectedMemory.comments && selectedMemory.comments.length > 0 ? (
                selectedMemory.comments.map((comment: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px',
                      background: '#f5f5f5',
                      borderRadius: '8px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: colors.primary,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {comment.user?.firstName?.[0] || 'U'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#000' }}>
                          {comment.user?.firstName} {comment.user?.lastName}
                        </span>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '14px', color: colors.body, margin: 0 }}>
                        {comment.text}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px 0' }}>
                  No comments yet. Be the first to comment!
                </p>
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  required
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    background: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Memories;
