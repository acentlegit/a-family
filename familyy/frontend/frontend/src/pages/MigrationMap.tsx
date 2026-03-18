import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import api from '../config/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MigrationMap.css';
import { FaPlus, FaEdit, FaTrash, FaMapMarkerAlt } from 'react-icons/fa';

// Fix for default marker icons in React/Webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MigrationLocation {
  _id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  year: string;
  isOrigin: boolean;
  order: number;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
}

const MigrationMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Start as false - map shows immediately
  const [locations, setLocations] = useState<MigrationLocation[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<MigrationLocation | null>(null);
  const [newLocation, setNewLocation] = useState({
    name: '',
    latitude: '',
    longitude: '',
    description: '',
    year: '',
    isOrigin: false,
    order: 0
  });
  const [saving, setSaving] = useState(false);
  const [mapContainerReady, setMapContainerReady] = useState(false);

  // Check if map container is ready
  useEffect(() => {
    const checkContainer = () => {
      if (mapRef.current && mapRef.current.offsetWidth > 0 && mapRef.current.offsetHeight > 0) {
        console.log('Map container is ready', {
          width: mapRef.current.offsetWidth,
          height: mapRef.current.offsetHeight
        });
        setMapContainerReady(true);
      } else {
        setTimeout(checkContainer, 100);
      }
    };
    checkContainer();
  }, []);

  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchLocations();
    }
  }, [selectedFamilyId]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMap();
    }
  }, [locations]);

  const fetchFamilies = async () => {
    try {
      const response = await api.get('/families');
      setFamilies(response.data.data || []);
      if (response.data.data && response.data.data.length > 0) {
        setSelectedFamilyId(response.data.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching families:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    if (!selectedFamilyId) return;
    
    try {
      const response = await api.get(`/migration/${selectedFamilyId}`);
      setLocations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching migration locations:', error);
    }
  };

  const updateMap = () => {
    if (!mapInstanceRef.current) return;

    console.log('Updating map with locations:', locations.length);
    
    // Clear existing markers and polylines
    markersRef.current.forEach(marker => mapInstanceRef.current?.removeLayer(marker));
    polylinesRef.current.forEach(polyline => mapInstanceRef.current?.removeLayer(polyline));
    markersRef.current = [];
    polylinesRef.current = [];

    if (locations.length === 0) {
      console.log('No locations, map cleared');
      return;
    }

    // Add markers for each location
    const sortedLocations = [...locations].sort((a, b) => a.order - b.order);
    const coordinates: [number, number][] = [];

    sortedLocations.forEach((location) => {
      const marker = L.marker([location.latitude, location.longitude]).addTo(mapInstanceRef.current!);
      
      const popupContent = `
        <div style="color: #001F3F; padding: 10px; min-width: 200px;">
          <h3 style="margin: 0 0 10px 0; color: #001F3F; font-size: 16px;">${location.isOrigin ? '🏠' : '📍'} ${location.name}</h3>
          ${location.year ? `<p style="margin: 5px 0; color: #666; font-size: 13px;"><strong>Year:</strong> ${location.year}</p>` : ''}
          ${location.description ? `<p style="margin: 5px 0; color: #333; font-size: 13px;">${location.description}</p>` : ''}
          ${location.isOrigin ? '<p style="margin: 5px 0; color: #10B981; font-size: 12px; font-weight: 600;">Family Origin</p>' : ''}
        </div>
      `;
      
      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
      coordinates.push([location.latitude, location.longitude]);
    });

    // Draw migration path if there are multiple locations
    if (coordinates.length > 1) {
      const polyline = L.polyline(coordinates, {
        color: '#b3d9ff',
        weight: 3,
        opacity: 0.6,
        dashArray: '10, 10'
      }).addTo(mapInstanceRef.current);
      polylinesRef.current.push(polyline);
    }

    // Fit map to show all markers
    if (coordinates.length > 0) {
      const group = new L.FeatureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  useEffect(() => {
    if (!mapContainerReady) {
      console.log('Waiting for map container to be ready...');
      return;
    }
    
    console.log('Map useEffect triggered', {
      mapRef: !!mapRef.current,
      mapInstance: !!mapInstanceRef.current,
      mapContainerReady,
      selectedFamilyId
    });
    
    if (!mapRef.current) {
      console.warn('Map ref not available yet');
      return;
    }
    
    if (mapInstanceRef.current) {
      console.log('Map already initialized, skipping');
      return;
    }

    setMapError(null);

    const initMap = () => {
      try {
        if (!mapRef.current) {
          console.error('Map ref is null');
          setIsLoading(false);
          return;
        }

        // Ensure the container has dimensions
        if (mapRef.current.offsetHeight === 0 || mapRef.current.offsetWidth === 0) {
          console.warn('Map container has no dimensions, retrying...');
          setTimeout(initMap, 100);
          return;
        }

        console.log('Initializing map...', {
          width: mapRef.current.offsetWidth,
          height: mapRef.current.offsetHeight
        });

        // Create map immediately
        const map = L.map(mapRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          preferCanvas: false
        }).setView([20, 0], 2);
        
        // Ensure map is ready
        map.whenReady(() => {
          console.log('Map is ready and rendered');
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });

        // Use fast tile provider with optimized settings
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          tileSize: 256,
          zoomOffset: 0,
          updateWhenZooming: false,
          updateWhenIdle: true
        });

        tileLayer.addTo(map);
        mapInstanceRef.current = map;
        
        // Force map to invalidate size multiple times to ensure it renders
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            console.log('Map initialized and size invalidated (first)');
          }
        }, 100);
        
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            console.log('Map initialized and size invalidated (second)');
          }
        }, 300);
        
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
            console.log('Map initialized and size invalidated (third)');
          }
        }, 500);
        
        // Hide loading after map is ready
        setTimeout(() => {
          setIsLoading(false);
        }, 200);
      } catch (error: any) {
        console.error('Error initializing map:', error);
        setMapError('Failed to initialize map. Please try refreshing the page.');
        setIsLoading(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initMap, 50);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          markersRef.current.forEach(marker => mapInstanceRef.current?.removeLayer(marker));
          polylinesRef.current.forEach(polyline => mapInstanceRef.current?.removeLayer(polyline));
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error('Error removing map:', e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [mapContainerReady]);

  const handleCreateLocation = async () => {
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }

    if (!newLocation.name || !newLocation.latitude || !newLocation.longitude) {
      alert('Name, latitude, and longitude are required');
      return;
    }

    try {
      setSaving(true);
      await api.post(`/migration/${selectedFamilyId}`, newLocation);
      setNewLocation({
        name: '',
        latitude: '',
        longitude: '',
        description: '',
        year: '',
        isOrigin: false,
        order: locations.length
      });
      setShowAddModal(false);
      fetchLocations();
    } catch (error: any) {
      console.error('Error creating migration location:', error);
      alert(error.response?.data?.message || 'Failed to create migration location');
    } finally {
      setSaving(false);
    }
  };

  const handleEditLocation = (location: MigrationLocation) => {
    setEditingLocation(location);
    setNewLocation({
      name: location.name,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      description: location.description || '',
      year: location.year || '',
      isOrigin: location.isOrigin,
      order: location.order
    });
    setShowEditModal(true);
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation) return;

    if (!newLocation.name || !newLocation.latitude || !newLocation.longitude) {
      alert('Name, latitude, and longitude are required');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/migration/${editingLocation._id}`, newLocation);
      setEditingLocation(null);
      setNewLocation({
        name: '',
        latitude: '',
        longitude: '',
        description: '',
        year: '',
        isOrigin: false,
        order: 0
      });
      setShowEditModal(false);
      fetchLocations();
    } catch (error: any) {
      console.error('Error updating migration location:', error);
      alert(error.response?.data?.message || 'Failed to update migration location');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!window.confirm('Are you sure you want to delete this migration location?')) {
      return;
    }

    try {
      await api.delete(`/migration/${locationId}`);
      fetchLocations();
    } catch (error: any) {
      console.error('Error deleting migration location:', error);
      alert(error.response?.data?.message || 'Failed to delete migration location');
    }
  };

  if (loading && !selectedFamilyId) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'white' }}>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', color: 'white', margin: '0 0 8px 0', fontWeight: '600' }}>Migration Map</h2>
            <p style={{ color: 'white', margin: 0, opacity: 0.9 }}>Explore the geographical journey of your family across generations</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {families.length > 0 && (
              <select
                value={selectedFamilyId}
                onChange={(e) => setSelectedFamilyId(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: '#fff',
                  color: '#000',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {families.map(family => (
                  <option key={family._id} value={family._id}>{family.name}</option>
                ))}
              </select>
            )}
            {selectedFamilyId && (
              <button
                onClick={() => {
                  setNewLocation({
                    name: '',
                    latitude: '',
                    longitude: '',
                    description: '',
                    year: '',
                    isOrigin: false,
                    order: locations.length
                  });
                  setShowAddModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.primary;
                }}
              >
                <FaPlus size={14} />
                Add Location
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <h3 style={{ color: '#000', marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>Family Migration Journey</h3>
          <p style={{ color: '#333', lineHeight: '1.8', margin: 0 }}>
            {selectedFamilyId && locations.length > 0
              ? `Explore the geographical journey of your family across generations. Click on markers to learn more about each location.`
              : selectedFamilyId
              ? 'No migration locations yet. Click "Add Location" to create your first migration point.'
              : 'Please select a family to view migration locations.'}
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <div
            ref={mapRef}
            id="migration-map-container"
            style={{
              height: '600px',
              width: '100%',
              borderRadius: '20px',
              overflow: 'hidden',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              minHeight: '600px',
              zIndex: 1,
              display: 'block'
            }}
          />
          
          {isLoading && !mapError && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                zIndex: 10
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 20px' }} />
                <p>Loading map...</p>
              </div>
            </div>
          )}

          {mapError && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: '20px',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.error,
                padding: '40px',
                textAlign: 'center',
                zIndex: 1000
              }}
            >
              <div>
                <p style={{ fontSize: '18px', marginBottom: '10px' }}>⚠️ {mapError}</p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '12px 24px',
                    background: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600'
                  }}
                >
                  Refresh Page
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Locations List */}
        {selectedFamilyId && locations.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ color: '#000', marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>Migration Locations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {locations.sort((a, b) => a.order - b.order).map((location) => (
                <div
                  key={location._id}
                  style={{
                    background: '#fff',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <FaMapMarkerAlt color={location.isOrigin ? '#10B981' : colors.primary} />
                      <h4 style={{ color: '#000', margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        {location.name} {location.isOrigin && <span style={{ color: '#10B981', fontSize: '12px' }}>(Origin)</span>}
                      </h4>
                    </div>
                    {location.year && (
                      <p style={{ color: '#333', margin: '4px 0', fontSize: '14px' }}>
                        <strong>Year:</strong> {location.year}
                      </p>
                    )}
                    {location.description && (
                      <p style={{ color: '#333', margin: '4px 0', fontSize: '14px' }}>
                        {location.description}
                      </p>
                    )}
                    <p style={{ color: '#666', margin: '4px 0', fontSize: '12px' }}>
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEditLocation(location)}
                      style={{
                        padding: '8px',
                        background: 'transparent',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: colors.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Edit location"
                    >
                      <FaEdit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location._id)}
                      style={{
                        padding: '8px',
                        background: 'transparent',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: colors.error,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Delete location"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Location Modal */}
        {showAddModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setShowAddModal(false)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ color: '#000', margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>Add Migration Location</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Location Name *
                  </label>
                  <input
                    type="text"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    placeholder="e.g., Hyderabad, India"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newLocation.latitude}
                      onChange={(e) => setNewLocation({ ...newLocation, latitude: e.target.value })}
                      placeholder="e.g., 17.3850"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newLocation.longitude}
                      onChange={(e) => setNewLocation({ ...newLocation, longitude: e.target.value })}
                      placeholder="e.g., 78.4867"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Year
                  </label>
                  <input
                    type="text"
                    value={newLocation.year}
                    onChange={(e) => setNewLocation({ ...newLocation, year: e.target.value })}
                    placeholder="e.g., 1985 or 1955-1985"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Description
                  </label>
                  <textarea
                    value={newLocation.description}
                    onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                    placeholder="e.g., Family origin - Birthplace of the lineage"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newLocation.isOrigin}
                      onChange={(e) => setNewLocation({ ...newLocation, isOrigin: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: '#000', fontSize: '14px' }}>Mark as Family Origin</span>
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Order (for migration path)
                  </label>
                  <input
                    type="number"
                    value={newLocation.order}
                    onChange={(e) => setNewLocation({ ...newLocation, order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    onClick={() => setShowAddModal(false)}
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateLocation}
                    disabled={saving}
                    style={{
                      padding: '10px 20px',
                      background: colors.primary,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: saving ? 0.6 : 1
                    }}
                  >
                    {saving ? 'Saving...' : 'Add Location'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Location Modal */}
        {showEditModal && editingLocation && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => {
              setShowEditModal(false);
              setEditingLocation(null);
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ color: '#000', margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>Edit Migration Location</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Location Name *
                  </label>
                  <input
                    type="text"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    placeholder="e.g., Hyderabad, India"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newLocation.latitude}
                      onChange={(e) => setNewLocation({ ...newLocation, latitude: e.target.value })}
                      placeholder="e.g., 17.3850"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newLocation.longitude}
                      onChange={(e) => setNewLocation({ ...newLocation, longitude: e.target.value })}
                      placeholder="e.g., 78.4867"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Year
                  </label>
                  <input
                    type="text"
                    value={newLocation.year}
                    onChange={(e) => setNewLocation({ ...newLocation, year: e.target.value })}
                    placeholder="e.g., 1985 or 1955-1985"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Description
                  </label>
                  <textarea
                    value={newLocation.description}
                    onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                    placeholder="e.g., Family origin - Birthplace of the lineage"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newLocation.isOrigin}
                      onChange={(e) => setNewLocation({ ...newLocation, isOrigin: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: '#000', fontSize: '14px' }}>Mark as Family Origin</span>
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#000', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Order (for migration path)
                  </label>
                  <input
                    type="number"
                    value={newLocation.order}
                    onChange={(e) => setNewLocation({ ...newLocation, order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'white',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingLocation(null);
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: '#000',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateLocation}
                    disabled={saving}
                    style={{
                      padding: '10px 20px',
                      background: colors.primary,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: saving ? 0.6 : 1
                    }}
                  >
                    {saving ? 'Saving...' : 'Update Location'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MigrationMap;
