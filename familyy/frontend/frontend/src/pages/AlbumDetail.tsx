import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../config/api';
import { colors } from '../styles/colors';
import { FaUpload } from 'react-icons/fa';

const AlbumDetail: React.FC = () => {
  const { familyId, albumId } = useParams<{ familyId: string; albumId: string }>();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (albumId) {
      fetchAlbum();
    }
  }, [albumId]);

  const fetchAlbum = async () => {
    try {
      const response = await api.get(`/albums/${albumId}`);
      setAlbum(response.data.album);
    } catch (error) {
      console.error('Failed to fetch album:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('photos', file);
    });

    try {
      await api.post(`/albums/${albumId}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setShowUploadModal(false);
      setSelectedFiles([]);
      fetchAlbum();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      </Layout>
    );
  }

  if (!album) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>Album not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <button
          onClick={() => navigate(`/albums/${familyId}`)}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.primary,
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px'
          }}
        >
          ← Back to Albums
        </button>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: colors.title, margin: '0 0 8px 0' }}>
            {album.name}
          </h1>
          {album.description && (
            <p style={{ color: colors.body, fontSize: '16px', margin: '0 0 20px 0' }}>
              {album.description}
            </p>
          )}
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              background: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaUpload /> Upload Photos
          </button>
        </div>

        {album.photos && album.photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ color: colors.body, fontSize: '18px', marginBottom: '20px' }}>
              No photos in this album yet.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              style={{
                background: colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Upload your first photo
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {album.photos?.map((photo: any) => (
              <div
                key={photo._id || photo.filename}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <img
                  src={photo.url || `/uploads/${photo.filename}`}
                  alt={photo.description || 'Photo'}
                  style={{
                    width: '100%',
                    height: '250px',
                    objectFit: 'cover'
                  }}
                />
                {photo.description && (
                  <div style={{ padding: '16px' }}>
                    <p style={{
                      color: colors.body,
                      fontSize: '14px',
                      margin: 0
                    }}>
                      {photo.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showUploadModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: colors.title,
                margin: '0 0 24px 0'
              }}>
                Upload Photos
              </h2>
              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.title,
                    marginBottom: '8px'
                  }}>
                    Select Photos
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    required
                  />
                  {selectedFiles.length > 0 && (
                    <p style={{
                      marginTop: '8px',
                      color: colors.body,
                      fontSize: '14px'
                    }}>
                      {selectedFiles.length} file(s) selected
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="submit"
                    disabled={uploading}
                    style={{
                      flex: 1,
                      background: uploading ? colors.muted : colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: uploading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFiles([]);
                    }}
                    style={{
                      flex: 1,
                      background: colors.sectionBg,
                      color: colors.title,
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AlbumDetail;
