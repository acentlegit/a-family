import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { colors } from '../styles/colors';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const MigrationMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    setIsLoading(true);
    setMapError(null);

    // Small delay to ensure DOM is ready
    const initMap = () => {
      try {
        if (!mapRef.current) {
          setIsLoading(false);
          return;
        }

        const map = L.map(mapRef.current, {
          zoomControl: true,
          scrollWheelZoom: true
        }).setView([20, 0], 2);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map);

        const indiaMarker = L.marker([17.3850, 78.4867]).addTo(map);
        indiaMarker.bindPopup(`
          <div style="color: #001F3F; padding: 10px;">
            <h3 style="margin: 0 0 10px 0; color: #001F3F;">🇮🇳 Hyderabad, India</h3>
            <p style="margin: 0; color: #333;">Family origin - Birthplace of the Arakala lineage</p>
          </div>
        `);

        const usaMarker = L.marker([32.7767, -96.7970]).addTo(map);
        usaMarker.bindPopup(`
          <div style="color: #001F3F; padding: 10px;">
            <h3 style="margin: 0 0 10px 0; color: #001F3F;">🇺🇸 Dallas, USA</h3>
            <p style="margin: 0; color: #333;">Primary migration destination - 1985</p>
          </div>
        `);

        L.polyline(
          [[17.3850, 78.4867], [32.7767, -96.7970]],
          {
            color: '#b3d9ff',
            weight: 3,
            opacity: 0.6,
            dashArray: '10, 10'
          }
        ).addTo(map);

        mapInstanceRef.current = map;
        
        // Wait for map tiles to load before hiding loading
        map.whenReady(() => {
          setIsLoading(false);
        });
      } catch (error: any) {
        console.error('Error initializing map:', error);
        setMapError('Failed to initialize map. Please try refreshing the page.');
        setIsLoading(false);
      }
    };

    // Initialize after a small delay to ensure DOM is ready
    const timer = setTimeout(initMap, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error('Error removing map:', e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <Layout>
      <div>
        <h2 style={{ fontSize: '24px', color: colors.title, margin: '0 0 8px 0' }}>Migration Map</h2>
        <p style={{ color: colors.muted, margin: '0 0 24px 0' }}>Explore the geographical journey of your family across generations</p>

        <div
          style={{
            background: colors.cardBg,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            padding: '20px',
            marginBottom: '24px'
          }}
        >
          <h3 style={{ color: colors.title, marginBottom: '12px', fontSize: '18px' }}>Family Migration Journey</h3>
          <p style={{ color: colors.body, lineHeight: '1.8', margin: 0 }}>
            Explore the geographical journey of the Arakala family across generations. 
            Click on markers to learn more about each location.
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <div
            ref={mapRef}
            style={{
              height: '600px',
              borderRadius: '20px',
              overflow: 'hidden',
              border: `1px solid ${colors.border}`,
              background: colors.sectionBg
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
                color: colors.body,
                zIndex: 1000
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
                background: colors.sectionBg,
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
      </div>
    </Layout>
  );
};

export default MigrationMap;
