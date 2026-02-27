import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import api, { getApiUrl } from '../config/api';
import { FaPlus, FaDownload, FaTrash, FaImages, FaVideo, FaTimes, FaUpload } from 'react-icons/fa';

const MediaGallery: React.FC = () => {
  const [media, setMedia] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  
  // AWS S3 Upload state
  const [showAWSUploadModal, setShowAWSUploadModal] = useState(false);
  const [awsFiles, setAwsFiles] = useState<File[]>([]);
  const [uploadingToAWS, setUploadingToAWS] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchMedia();
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

  const handleAWSFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAwsFiles(files);
  };

  const handleUploadToAWS = async () => {
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }
    
    if (awsFiles.length === 0) {
      alert('Please select at least one file to upload');
      return;
    }

    setUploadingToAWS(true);
    try {
      const formData = new FormData();
      
      // Append files
      awsFiles.forEach((file) => {
        formData.append('media', file);
      });
      
      // Force AWS S3 upload to a-family-media bucket
      formData.append('forceS3', 'true');
      formData.append('s3Bucket', 'a-family-media');

      const response = await api.post(`/media/${selectedFamilyId}`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        alert(`Successfully uploaded ${awsFiles.length} file(s) to AWS S3 (a-family-media bucket)!`);
        setShowAWSUploadModal(false);
        setAwsFiles([]);
        fetchMedia();
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading to AWS:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error uploading to AWS S3. Please check your AWS configuration.';
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setUploadingToAWS(false);
    }
  };

  const fetchMedia = async () => {
    if (!selectedFamilyId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/media/${selectedFamilyId}${filter !== 'all' ? `?type=${filter}` : ''}`);
      const mediaData = response.data.data || [];
      
      // Fix URLs for local storage files
      const fixedMedia = mediaData.map((item: any) => {
        if (item.url) {
          const originalUrl = item.url;
          
          // If URL is relative, make it absolute
          if (item.url.startsWith('/uploads/')) {
            const apiUrl = getApiUrl();
            const baseUrl = apiUrl.replace('/api', '');
            item.url = `${baseUrl}${item.url}`;
            console.log(`Fixed URL: ${originalUrl} -> ${item.url}`);
          } else if (item.url.startsWith('uploads/')) {
            const apiUrl = getApiUrl();
            const baseUrl = apiUrl.replace('/api', '');
            item.url = `${baseUrl}/${item.url}`;
            console.log(`Fixed URL: ${originalUrl} -> ${item.url}`);
          } else if (item.filename && !item.url.startsWith('http://') && !item.url.startsWith('https://') && !item.url.startsWith('data:') && !item.url.includes('drive.google.com')) {
            // If it's just a filename, construct full URL
            const apiUrl = getApiUrl();
            const baseUrl = apiUrl.replace('/api', '');
            item.url = `${baseUrl}/uploads/${item.filename}`;
            console.log(`Fixed URL from filename: ${item.filename} -> ${item.url}`);
          }
          
          // Fix thumbnail URL too
          if (item.thumbnail) {
            if (item.thumbnail.startsWith('/uploads/')) {
              const apiUrl = getApiUrl();
              const baseUrl = apiUrl.replace('/api', '');
              item.thumbnail = `${baseUrl}${item.thumbnail}`;
            } else if (item.thumbnail.startsWith('uploads/')) {
              const apiUrl = getApiUrl();
              const baseUrl = apiUrl.replace('/api', '');
              item.thumbnail = `${baseUrl}/${item.thumbnail}`;
            } else if (item.filename && !item.thumbnail.startsWith('http')) {
              const apiUrl = getApiUrl();
              const baseUrl = apiUrl.replace('/api', '');
              item.thumbnail = `${baseUrl}/uploads/${item.filename}`;
            }
          } else if (item.filename) {
            // Use same URL as main image for thumbnail
            item.thumbnail = item.url;
          }
        } else if (item.filename) {
          // If no URL but has filename, construct URL
          const apiUrl = getApiUrl();
          const baseUrl = apiUrl.replace('/api', '');
          item.url = `${baseUrl}/uploads/${item.filename}`;
          item.thumbnail = item.url;
          console.log(`Constructed URL from filename: ${item.filename} -> ${item.url}`);
        }
        
        return item;
      });
      
      console.log('Media fetched:', fixedMedia.length, 'items');
      setMedia(fixedMedia);
    } catch (error) {
      console.error('Error fetching media:', error);
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }
    
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    try {
      console.log('Starting upload...', selectedFiles.length, 'files');
      const formData = new FormData();
      
      // Append files
      selectedFiles.forEach((file) => {
        formData.append('media', file);
      });

      console.log('Sending request to:', `/media/${selectedFamilyId}`);
      const response = await api.post(`/media/${selectedFamilyId}`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        console.log('Upload successful:', response.data);
        alert(`Successfully uploaded ${selectedFiles.length} file(s)!`);
        setShowUploadModal(false);
        setSelectedFiles([]);
        fetchMedia();
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading media:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error uploading media. Please try again.';
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    if (!window.confirm('Are you sure you want to delete this media?')) return;

    try {
      await api.delete(`/media/${mediaId}`);
      fetchMedia();
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Error deleting media. Please try again.');
    }
  };

  const filteredMedia = media.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  if (loading && !selectedFamilyId) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout selectedFamily={families.find(f => f._id === selectedFamilyId)}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 8px 0' }}>Media Gallery</h2>
            <p style={{ color: colors.muted, margin: 0 }}>Browse and manage your family photos and videos</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowAWSUploadModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: '#FF9900',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <span>☁️</span> Upload to AWS
            </button>
          </div>
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

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          borderBottom: `1px solid ${colors.border}`,
          paddingBottom: '12px'
        }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 20px',
              background: filter === 'all' ? colors.primarySoft : 'transparent',
              color: filter === 'all' ? colors.primary : colors.body,
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            All Media
          </button>
          <button
            onClick={() => setFilter('image')}
            style={{
              padding: '8px 20px',
              background: filter === 'image' ? colors.primarySoft : 'transparent',
              color: filter === 'image' ? colors.primary : colors.body,
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaImages /> Photos
          </button>
          <button
            onClick={() => setFilter('video')}
            style={{
              padding: '8px 20px',
              background: filter === 'video' ? colors.primarySoft : 'transparent',
              color: filter === 'video' ? colors.primary : colors.body,
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaVideo /> Videos
          </button>
        </div>

        {/* Media Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : filteredMedia.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {filteredMedia.map((item) => (
              <div
                key={item._id}
                style={{
                  background: colors.cardBg,
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {item.type === 'image' ? (
                  <div style={{
                    height: '200px',
                    width: '100%',
                    backgroundColor: colors.sectionBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    if (item.url) {
                      setSelectedMedia(item);
                      setShowMediaViewer(true);
                    }
                  }}
                  >
                    {item.url ? (
                      <img
                        src={(() => {
                          // Construct proper image URL
                          const mediaUrl = item.url;
                          if (!mediaUrl) return '';
                          
                          // If already a full URL (http/https), use as-is
                          if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
                            // If URL contains localhost or is HTTP (not HTTPS), replace with current API base
                            if (mediaUrl.includes('localhost') || mediaUrl.startsWith('http://')) {
                              const apiUrl = getApiUrl();
                              const baseUrl = apiUrl.replace('/api', '');
                              // Replace the old base URL with current one
                              const urlObj = new URL(mediaUrl);
                              return mediaUrl.replace(urlObj.origin, baseUrl);
                            }
                            return mediaUrl;
                          }
                          
                          // If it's a filename or relative path, construct full URL
                          const apiUrl = getApiUrl();
                          const baseUrl = apiUrl.replace('/api', '');
                          
                          // Handle different path formats
                          if (mediaUrl.startsWith('/uploads/')) {
                            return `${baseUrl}${mediaUrl}`;
                          } else if (mediaUrl.startsWith('uploads/')) {
                            return `${baseUrl}/${mediaUrl}`;
                          } else if (mediaUrl.startsWith('/')) {
                            return `${baseUrl}${mediaUrl}`;
                          } else {
                            // Just filename, add /uploads/ prefix
                            return `${baseUrl}/uploads/${mediaUrl}`;
                          }
                        })()}
                        alt={item.memoryTitle || 'Photo'}
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
                          
                          console.error('Image load error for URL:', originalSrc);
                          console.error('Original media URL:', item.url);
                          console.error('Media source:', item.source);
                          
                          // Add current URL to tried list
                          if (!triedUrls.includes(originalSrc)) {
                            triedUrls.push(originalSrc);
                          }
                          
                          // Try alternative URL formats
                          const mediaUrl = item.url || '';
                          const thumbnailUrl = item.thumbnail || '';
                          const filename = item.filename || '';
                          const apiUrl = getApiUrl();
                          const baseUrl = apiUrl.replace('/api', '');
                          
                          // Extract just the filename if URL contains path
                          let justFilename = mediaUrl;
                          if (mediaUrl.includes('/')) {
                            justFilename = mediaUrl.split('/').pop() || mediaUrl;
                          }
                          if (filename) {
                            justFilename = filename;
                          }
                          
                          // Try different URL formats
                          const alternatives = [
                            // Try with current base URL and filename
                            `${baseUrl}/uploads/${justFilename}`,
                            // Try with full path if it was a full URL (but replace origin)
                            mediaUrl.startsWith('http') ? (() => {
                              try {
                                const url = new URL(mediaUrl);
                                return `${baseUrl}${url.pathname}`;
                              } catch {
                                return null;
                              }
                            })() : null,
                            // Try with base URL prefix
                            mediaUrl.startsWith('/') ? `${baseUrl}${mediaUrl}` : (mediaUrl ? `${baseUrl}/${mediaUrl}` : null),
                            // Try thumbnail
                            thumbnailUrl,
                            // Try original URL as-is (if not already tried)
                            mediaUrl && !triedUrls.includes(mediaUrl) ? mediaUrl : null
                          ].filter(url => url && !triedUrls.includes(url) && url.trim() !== '');
                          
                          // Find first alternative not yet tried
                          const nextUrl = alternatives.find(url => !triedUrls.includes(url));
                          
                          if (nextUrl) {
                            console.log('Trying alternative URL:', nextUrl);
                            triedUrls.push(nextUrl);
                            img.dataset.triedUrls = JSON.stringify(triedUrls);
                            img.src = nextUrl;
                          } else {
                            // All alternatives failed, show error message
                            console.error('All image URL alternatives failed. Tried:', triedUrls);
                            img.style.display = 'none';
                            const parent = img.parentElement;
                            if (parent && !parent.querySelector('.image-error')) {
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'image-error';
                              errorDiv.style.cssText = 'color: #999; padding: 20px; text-align: center; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f5f5f5;';
                              errorDiv.textContent = 'Image not available';
                              parent.appendChild(errorDiv);
                            }
                          }
                        }}
                        onLoad={(e) => {
                          console.log('Media image loaded successfully:', item.url);
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
                    ) : (
                      <span style={{ color: colors.muted, fontSize: '14px' }}>No image</span>
                    )}
                  </div>
                ) : (
                  <video
                    src={item.url}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover'
                    }}
                    controls
                  />
                )}

                <div style={{ padding: '12px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: '13px',
                        color: colors.body,
                        margin: '0 0 4px 0',
                        fontWeight: '500'
                      }}>
                        {item.memoryTitle || 'Untitled'}
                      </p>
                      <p style={{
                        fontSize: '11px',
                        color: colors.muted,
                        margin: 0
                      }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.url) {
                            const link = document.createElement('a');
                            link.href = item.url;
                            link.download = item.filename || 'photo';
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }}
                        style={{
                          padding: '6px',
                          background: colors.primarySoft,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <FaDownload size={12} color={colors.primary} />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        style={{
                          padding: '6px',
                          background: '#FEE2E2',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <FaTrash size={12} color="#DC2626" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Type Badge */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {item.type === 'image' ? <FaImages size={10} /> : <FaVideo size={10} />}
                  {item.type === 'image' ? 'Photo' : 'Video'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: colors.cardBg,
            padding: '60px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📷</div>
            <h3 style={{ fontSize: '20px', color: colors.title, margin: '0 0 8px 0' }}>
              No media yet
            </h3>
            <p style={{ color: colors.muted, margin: '0 0 24px 0' }}>
              Upload photos and videos to start building your family gallery
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
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
              Upload First Media
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
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
            background: colors.cardBg,
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', color: colors.title, margin: 0 }}>
                Upload Media
              </h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
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

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 40px',
                border: `2px dashed ${colors.border}`,
                borderRadius: '12px',
                cursor: 'pointer',
                background: colors.sectionBg,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.primary;
                e.currentTarget.style.background = colors.primarySoft;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.background = colors.sectionBg;
              }}
              >
                <FaUpload size={48} color={colors.primary} style={{ marginBottom: '16px' }} />
                <span style={{ color: colors.title, fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  Click to upload or drag and drop
                </span>
                <span style={{ color: colors.muted, fontSize: '14px' }}>
                  Photos (JPG, PNG) or Videos (MP4, MOV)
                </span>
                <span style={{ color: colors.muted, fontSize: '12px', marginTop: '4px' }}>
                  Maximum 10 files at once
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: colors.body, fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  {selectedFiles.length} file(s) selected:
                </p>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  background: colors.sectionBg,
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px',
                        background: colors.cardBg,
                        borderRadius: '6px',
                        marginBottom: index < selectedFiles.length - 1 ? '8px' : 0
                      }}
                    >
                      {file.type.startsWith('video') ? (
                        <FaVideo size={16} color={colors.primary} />
                      ) : (
                        <FaImages size={16} color={colors.primary} />
                      )}
                      <span style={{ flex: 1, fontSize: '13px', color: colors.body }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: '12px', color: colors.muted }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowUploadModal(false);
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
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
                style={{
                  padding: '12px 24px',
                  background: uploading || selectedFiles.length === 0 ? colors.muted : colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: uploading || selectedFiles.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AWS Upload Modal */}
      {showAWSUploadModal && (
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
            background: colors.cardBg,
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', color: colors.title, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>☁️</span> Upload to AWS S3
              </h2>
              <button
                onClick={() => {
                  setShowAWSUploadModal(false);
                  setAwsFiles([]);
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

            <div style={{ marginBottom: '24px', padding: '16px', background: '#FFF3CD', borderRadius: '8px', border: '1px solid #FFE69C' }}>
              <p style={{ color: '#856404', fontSize: '14px', margin: 0 }}>
                <strong>ℹ️ AWS S3 Upload:</strong> Files will be uploaded directly to the <strong>a-family-media</strong> AWS S3 bucket. All family photos and videos are stored securely in AWS cloud storage.
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 40px',
                border: `2px dashed ${colors.border}`,
                borderRadius: '12px',
                cursor: 'pointer',
                background: colors.sectionBg,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FF9900';
                e.currentTarget.style.background = '#FFF8E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.background = colors.sectionBg;
              }}
              >
                <span style={{ fontSize: '48px', marginBottom: '16px' }}>☁️</span>
                <span style={{ color: colors.title, fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  Click to select files for AWS S3
                </span>
                <span style={{ color: colors.muted, fontSize: '14px' }}>
                  Photos (JPG, PNG) or Videos (MP4, MOV)
                </span>
                <span style={{ color: colors.muted, fontSize: '12px', marginTop: '4px' }}>
                  Maximum 10 files at once
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleAWSFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {awsFiles.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: colors.body, fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  {awsFiles.length} file(s) selected for AWS S3:
                </p>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  background: colors.sectionBg,
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  {awsFiles.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px',
                        background: colors.cardBg,
                        borderRadius: '6px',
                        marginBottom: index < awsFiles.length - 1 ? '8px' : 0
                      }}
                    >
                      {file.type.startsWith('video') ? (
                        <FaVideo size={16} color="#FF9900" />
                      ) : (
                        <FaImages size={16} color="#FF9900" />
                      )}
                      <span style={{ flex: 1, fontSize: '13px', color: colors.body }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: '12px', color: colors.muted }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAWSUploadModal(false);
                  setAwsFiles([]);
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
                onClick={handleUploadToAWS}
                disabled={uploadingToAWS || awsFiles.length === 0}
                style={{
                  padding: '12px 24px',
                  background: uploadingToAWS || awsFiles.length === 0 ? colors.muted : '#FF9900',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: uploadingToAWS || awsFiles.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {uploadingToAWS ? 'Uploading to AWS...' : (
                  <>
                    <span>☁️</span> Upload {awsFiles.length} File(s) to AWS S3
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {showMediaViewer && selectedMedia && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => {
            setShowMediaViewer(false);
            setSelectedMedia(null);
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowMediaViewer(false);
                setSelectedMedia(null);
              }}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                fontSize: '24px'
              }}
            >
              <FaTimes />
            </button>
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.url}
                alt={selectedMedia.memoryTitle || 'Photo'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
                onError={(e) => {
                  console.error('Image load error in viewer:', selectedMedia.url);
                  e.currentTarget.src = '';
                  e.currentTarget.alt = 'Image not available';
                }}
              />
            ) : (
              <video
                src={selectedMedia.url}
                controls
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  borderRadius: '8px'
                }}
              />
            )}
            <div style={{ marginTop: '16px', color: 'white', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                {selectedMedia.memoryTitle || 'Untitled'}
              </p>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                {new Date(selectedMedia.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default MediaGallery;
