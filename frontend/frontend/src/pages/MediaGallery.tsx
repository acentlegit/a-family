import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import api, { getApiUrl } from '../config/api';
import { FaPlus, FaDownload, FaTrash, FaImages, FaVideo, FaTimes, FaUpload } from 'react-icons/fa';

const MEDIA_GALLERY_CACHE_KEY = 'media_gallery_cache_v1';

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
      const fixedUrl = `https://s3.${region}.amazonaws.com/${bucketName}/${key}`;
      console.log(`Fixed S3 URL: ${url} -> ${fixedUrl}`);
      return fixedUrl;
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

/**
 * Helper function to fix media item URLs after fetching from API
 */
const fixMediaUrls = (items: any[]): any[] => {
  return items.map((item: any) => {
    // Use getImageUrl which handles S3 URL fixing internally
    const fixedUrl = getImageUrl(item);
    const fixedThumbnail = item.thumbnail ? getImageUrl({ ...item, url: item.thumbnail }) : fixedUrl;
    
    return {
      ...item,
      url: fixedUrl || item.url,
      thumbnail: fixedThumbnail || item.thumbnail || fixedUrl
    };
  });
};

const MediaGallery: React.FC = () => {
  const [media, setMedia] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [loading, setLoading] = useState(false);
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
    try {
      const cachedRaw = sessionStorage.getItem(MEDIA_GALLERY_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (Array.isArray(cached?.families)) setFamilies(cached.families);
        if (typeof cached?.selectedFamilyId === 'string') setSelectedFamilyId(cached.selectedFamilyId);
        if (Array.isArray(cached?.media)) setMedia(cached.media);
      }
    } catch {
      // Ignore cache read errors
    }
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchMedia();
    }
  }, [selectedFamilyId]);

  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/families');
      const fetchedFamilies = response.data.data || [];
      setFamilies(fetchedFamilies);
      if (fetchedFamilies.length > 0 && !selectedFamilyId) {
        setSelectedFamilyId(fetchedFamilies[0]._id);
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
      
      // Fix URLs for all media items
      const fixedMedia = fixMediaUrls(mediaData);
      
      console.log('Media fetched:', fixedMedia.length, 'items');
      fixedMedia.forEach((item: any) => {
        console.log(`Media item: ${item.memoryTitle || 'Untitled'} - URL: ${item.url}, Source: ${item.source || 'unknown'}`);
      });
      
      setMedia(fixedMedia);
      try {
        sessionStorage.setItem(
          MEDIA_GALLERY_CACHE_KEY,
          JSON.stringify({
            families,
            selectedFamilyId,
            media: fixedMedia
          })
        );
      } catch {
        // Ignore cache write errors
      }
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

  return (
    <Layout selectedFamily={families.find(f => f._id === selectedFamilyId)}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', color: 'white', margin: '0 0 8px 0', fontWeight: '600' }}>Media Gallery</h2>
            <p style={{ color: 'white', margin: 0, opacity: 0.9 }}>Browse and manage your family photos and videos</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {loading && <span style={{ color: 'white', fontSize: '13px', opacity: 0.9 }}>Refreshing...</span>}
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
              background: filter === 'all' ? colors.primary : 'transparent',
              color: 'white',
              opacity: filter === 'all' ? 1 : 0.9,
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
              background: filter === 'image' ? colors.primary : 'transparent',
              color: 'white',
              opacity: filter === 'image' ? 1 : 0.9,
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
              background: filter === 'video' ? colors.primary : 'transparent',
              color: 'white',
              opacity: filter === 'video' ? 1 : 0.9,
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
        {loading && filteredMedia.length === 0 ? (
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
                    {(() => {
                      const imageUrl = getImageUrl(item);
                      if (!imageUrl) {
                        return <span style={{ color: '#333', fontSize: '14px' }}>No image</span>;
                      }
                      
                      return (
                        <img
                          src={imageUrl}
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
                            const retryCount = parseInt(img.dataset.retryCount || '0');
                            
                            // Check if this is a presigned URL (has AWS signature parameters)
                            const isPresignedUrl = originalSrc.includes('X-Amz-') || originalSrc.includes('AWSAccessKeyId');
                            
                            // Silently handle errors - no console output
                            // Mark as logged to prevent duplicate handling
                            if (!img.dataset.errorLogged) {
                              img.dataset.errorLogged = 'true';
                            }
                            
                            // Add current URL to tried list
                            if (!triedUrls.includes(originalSrc)) {
                              triedUrls.push(originalSrc);
                            }
                            
                            // For presigned URLs, don't try alternatives - they're unique and can't be replaced
                            // Only retry once in case of temporary network issues
                            if (isPresignedUrl) {
                              const refreshAttempts = parseInt(img.dataset.refreshAttempts || '0');
                              
                              if (retryCount < 1) {
                                // Retry once after a short delay (might be a temporary network issue)
                                img.dataset.retryCount = '1';
                                setTimeout(() => {
                                  img.src = originalSrc + (originalSrc.includes('?') ? '&' : '?') + '_retry=' + Date.now();
                                }, 1000);
                                return;
                              } else if (refreshAttempts < 1) {
                                // Presigned URL failed after retry - try to get fresh URL from API (only once)
                                img.dataset.refreshAttempts = '1';
                                
                                // Try to refetch media to get a fresh presigned URL
                                const refreshPresignedUrl = async () => {
                                  try {
                                    // Refetch media for this family to get fresh presigned URLs
                                    const response = await api.get(`/media/${selectedFamilyId}${filter !== 'all' ? `?type=${filter}` : ''}`);
                                    const refreshedMedia = response.data.data || [];
                                    
                                    // Find the matching media item by ID
                                    const refreshedItem = refreshedMedia.find((m: any) => 
                                      m._id === item._id || 
                                      (m.memoryId && item.memoryId && m.memoryId === item.memoryId)
                                    );
                                    
                                    if (refreshedItem && refreshedItem.url && refreshedItem.url !== originalSrc) {
                                      // Reset retry count for the new URL
                                      img.dataset.retryCount = '0';
                                      img.src = refreshedItem.url;
                                      return;
                                    }
                                  } catch (refreshError) {
                                    // Silently handle refresh errors
                                  }
                                  
                                  // If refresh failed or didn't help, show error immediately
                                  img.style.display = 'none';
                                  const parent = img.parentElement;
                                  if (parent && !parent.querySelector('.image-error')) {
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'image-error';
                                    errorDiv.style.cssText = 'color: #999; padding: 20px; text-align: center; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f5f5f5;';
                                    errorDiv.textContent = 'Image not available';
                                    parent.appendChild(errorDiv);
                                  }
                                };
                                
                                // Try to refresh after a short delay
                                setTimeout(refreshPresignedUrl, 500);
                                return;
                              } else {
                                // Already tried refresh, try original URL format as last resort
                                const originalUrlWithoutQuery = originalSrc.split('?')[0];
                                const triedOriginalUrl = img.dataset.triedOriginalUrl === 'true';
                                
                                if (!triedOriginalUrl && originalUrlWithoutQuery && originalUrlWithoutQuery !== originalSrc) {
                                  img.dataset.triedOriginalUrl = 'true';
                                  img.src = originalUrlWithoutQuery;
                                  return;
                                }
                                
                                // All attempts failed, show error silently
                                img.style.display = 'none';
                                const parent = img.parentElement;
                                if (parent && !parent.querySelector('.image-error')) {
                                  const errorDiv = document.createElement('div');
                                  errorDiv.className = 'image-error';
                                  errorDiv.style.cssText = 'color: #999; padding: 20px; text-align: center; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f5f5f5;';
                                  errorDiv.textContent = 'Image not available';
                                  parent.appendChild(errorDiv);
                                }
                                return;
                              }
                            }
                            
                            // For non-presigned URLs, try alternative URL formats
                            const alternatives = [
                              // Try thumbnail if different from main URL
                              item.thumbnail && item.thumbnail !== item.url ? getImageUrl({ ...item, url: item.thumbnail }) : null,
                              // Try with different base URL construction
                              item.filename ? (() => {
                                const apiUrl = getApiUrl();
                                const baseUrl = apiUrl.replace('/api', '');
                                return `${baseUrl}/uploads/${item.filename}`;
                              })() : null,
                              // Try original URL if it's different
                              item.url && item.url !== originalSrc ? item.url : null
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
                                errorDiv.style.cssText = 'color: #999; padding: 20px; text-align: center; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f5f5f5;';
                                errorDiv.textContent = 'Image not available';
                                parent.appendChild(errorDiv);
                              }
                            }
                          }}
                          onLoad={(e) => {
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
                      );
                    })()}
                  </div>
                ) : (
                  <video
                    src={getImageUrl(item)}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover'
                    }}
                    controls
                    onError={(e) => {
                      console.error('Video load error:', item.url);
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent && !parent.querySelector('.video-error')) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'video-error';
                        errorDiv.style.cssText = 'color: #999; padding: 20px; text-align: center; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f5f5f5;';
                        errorDiv.textContent = 'Video not available';
                        parent.appendChild(errorDiv);
                      }
                    }}
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
                        color: '#333',
                        margin: 0
                      }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const downloadUrl = getImageUrl(item);
                          if (downloadUrl) {
                            const link = document.createElement('a');
                            link.href = downloadUrl;
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
                        <FaDownload size={12} color="#000" />
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
            background: '#fff',
            padding: '60px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📷</div>
            <h3 style={{ fontSize: '20px', color: '#000', margin: '0 0 8px 0', fontWeight: '600' }}>
              No media yet
            </h3>
            <p style={{ color: '#333', margin: '0 0 24px 0' }}>
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
                <span style={{ color: '#000', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  Click to upload or drag and drop
                </span>
                <span style={{ color: '#333', fontSize: '14px' }}>
                  Photos (JPG, PNG) or Videos (MP4, MOV)
                </span>
                <span style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
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
                      <span style={{ fontSize: '12px', color: '#333' }}>
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
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', color: '#000', margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600' }}>
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
                <span style={{ color: '#000', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  Click to select files for AWS S3
                </span>
                <span style={{ color: '#333', fontSize: '14px' }}>
                  Photos (JPG, PNG) or Videos (MP4, MOV)
                </span>
                <span style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
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
                      <span style={{ fontSize: '12px', color: '#333' }}>
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
                src={getImageUrl(selectedMedia)}
                alt={selectedMedia.memoryTitle || 'Photo'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
                onError={(e) => {
                  const img = e.currentTarget;
                  const originalSrc = img.src;
                  const retryCount = parseInt(img.dataset.retryCount || '0');
                  
                  // Check if this is a presigned URL
                  const isPresignedUrl = originalSrc.includes('X-Amz-') || originalSrc.includes('AWSAccessKeyId');
                  
                  // For presigned URLs, retry once before giving up (silently)
                  if (isPresignedUrl) {
                    if (retryCount < 1) {
                      img.dataset.retryCount = '1';
                      setTimeout(() => {
                        img.src = originalSrc + (originalSrc.includes('?') ? '&' : '?') + '_retry=' + Date.now();
                      }, 1000);
                      return;
                    } else {
                      // Presigned URL failed after retry - show error silently
                      img.style.display = 'none';
                      const parent = img.parentElement;
                      if (parent && !parent.querySelector('.image-error')) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'image-error';
                        errorDiv.style.cssText = 'color: white; padding: 40px; text-align: center; font-size: 18px;';
                        errorDiv.textContent = 'Image not available';
                        parent.appendChild(errorDiv);
                      }
                      return;
                    }
                  }
                  
                  // For non-presigned URLs, try thumbnail as fallback (silently)
                  if (selectedMedia.thumbnail && selectedMedia.thumbnail !== originalSrc) {
                    const thumbnailUrl = getImageUrl({ ...selectedMedia, url: selectedMedia.thumbnail });
                    if (thumbnailUrl && thumbnailUrl !== originalSrc) {
                      img.src = thumbnailUrl;
                      return;
                    }
                  }
                  
                  // If all fails, show error silently
                  img.style.display = 'none';
                  const parent = img.parentElement;
                  if (parent && !parent.querySelector('.image-error')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'image-error';
                    errorDiv.style.cssText = 'color: white; padding: 40px; text-align: center; font-size: 18px;';
                    errorDiv.textContent = 'Image not available';
                    parent.appendChild(errorDiv);
                  }
                }}
                onLoad={() => {
                  // Remove any error messages if image loads
                  const parent = document.querySelector('.image-error');
                  if (parent) {
                    parent.remove();
                  }
                }}
              />
            ) : (
              <video
                src={getImageUrl(selectedMedia)}
                controls
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  borderRadius: '8px'
                }}
                onError={(e) => {
                  // Silently handle video load errors
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent && !parent.querySelector('.video-error')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'video-error';
                    errorDiv.style.cssText = 'color: white; padding: 40px; text-align: center; font-size: 18px;';
                    errorDiv.textContent = 'Video not available';
                    parent.appendChild(errorDiv);
                  }
                }}
              />
            )}
            <div style={{ marginTop: '16px', color: '#000', textAlign: 'center' }}>
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
