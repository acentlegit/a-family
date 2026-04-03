import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../config/api';
import { colors } from '../styles/colors';
import { FaPlus, FaImages } from 'react-icons/fa';

const Albums: React.FC = () => {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');

  useEffect(() => {
    if (familyId) {
      fetchAlbums();
    } else {
      // If no familyId, try to get from families
      fetchFirstFamily();
    }
  }, [familyId]);

  const fetchFirstFamily = async () => {
    try {
      const response = await api.get('/families');
      const families = response.data.data || [];
      if (families.length > 0) {
        navigate(`/albums/${families[0]._id}`);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    }
  };

  const fetchAlbums = async () => {
    try {
      const response = await api.get(`/albums/family/${familyId}`);
      setAlbums(response.data.albums || []);
    } catch (error) {
      console.error('Failed to fetch albums:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId) {
      alert('Family ID is required');
      return;
    }
    if (!newAlbumName.trim()) {
      alert('Album name is required');
      return;
    }
    try {
      const response = await api.post('/albums', {
        name: newAlbumName.trim(),
        description: newAlbumDescription.trim(),
        familyId: familyId
      });
      if (response.data.success && response.data.album) {
        // Refresh albums list to get the latest data
        await fetchAlbums();
        setShowCreateModal(false);
        setNewAlbumName('');
        setNewAlbumDescription('');
      } else {
        alert('Failed to create album');
      }
    } catch (error: any) {
      console.error('Create album error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create album';
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: colors.title, margin: 0 }}>
            Photo Albums
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
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
            <FaPlus /> Create Album
          </button>
        </div>

        {albums.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FaImages size={64} style={{ color: colors.muted, marginBottom: '20px' }} />
            <p style={{ color: colors.body, fontSize: '18px', marginBottom: '20px' }}>No albums yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
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
              Create your first album
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {albums.map((album) => (
              <Link
                key={album._id}
                to={`/albums/${familyId}/${album._id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit'
                }}
              >
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                >
                  {album.photos && album.photos.length > 0 && (
                    <img
                      src={album.photos[0].url || album.photos[0].filename}
                      alt={album.name}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  {(!album.photos || album.photos.length === 0) && (
                    <div style={{
                      width: '100%',
                      height: '200px',
                      background: colors.sectionBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FaImages size={48} style={{ color: colors.muted }} />
                    </div>
                  )}
                  <div style={{ padding: '20px' }}>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: colors.title,
                      margin: '0 0 8px 0'
                    }}>
                      {album.name}
                    </h2>
                    {album.description && (
                      <p style={{
                        color: colors.body,
                        fontSize: '14px',
                        margin: '0 0 12px 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {album.description}
                      </p>
                    )}
                    <p style={{
                      color: colors.muted,
                      fontSize: '14px',
                      margin: 0
                    }}>
                      {album.photos?.length || 0} Photos
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {showCreateModal && (
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
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: colors.title,
                margin: '0 0 24px 0'
              }}>
                Create New Album
              </h2>
              <form onSubmit={handleCreateAlbum} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.title,
                    marginBottom: '8px'
                  }}>
                    Album Name
                  </label>
                  <input
                    type="text"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.title,
                    marginBottom: '8px'
                  }}>
                    Description (optional)
                  </label>
                  <textarea
                    value={newAlbumDescription}
                    onChange={(e) => setNewAlbumDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '16px',
                      minHeight: '100px',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
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
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewAlbumName('');
                      setNewAlbumDescription('');
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

export default Albums;
