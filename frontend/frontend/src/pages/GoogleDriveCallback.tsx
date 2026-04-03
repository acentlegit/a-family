import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../config/api';

const GoogleDriveCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('Google OAuth error:', error);
        navigate('/media?googleDriveError=true');
        return;
      }

      if (code) {
        try {
          // Exchange code for tokens without passcode
          const response = await api.post('/google-drive/authorize', { code });
          if (response.data.success) {
            navigate('/media?googleDriveConnected=true');
          } else {
            throw new Error(response.data.message || 'Connection failed');
          }
        } catch (err: any) {
          console.error('Error processing callback:', err);
          const errorMsg = err.response?.data?.message || err.message || 'connection_failed';
          navigate(`/media?googleDriveError=true&message=${encodeURIComponent(errorMsg)}`);
        }
      } else {
        navigate('/media');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div className="spinner" />
      <p>Connecting Google Drive...</p>
    </div>
  );
};

export default GoogleDriveCallback;
