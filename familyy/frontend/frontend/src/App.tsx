import Login from './pages/Login';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';
import Families from './pages/Families';
import Members from './pages/Members';
import FamilyTree from './pages/FamilyTree';
import Memories from './pages/Memories';
import MediaGallery from './pages/MediaGallery';
import Events from './pages/Events';
import VideoCalls from './pages/VideoCalls';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import AdminPanel from './pages/AdminPanel';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdmin from './pages/SuperAdmin';
import Onboarding from './pages/Onboarding';
import GoogleDriveCallback from './pages/GoogleDriveCallback';
import WebsiteAdmin from './pages/WebsiteAdmin';
import Bios from './pages/Bios';
import Blog from './pages/Blog';
import Homepage from './pages/Homepage';
import Timeline from './pages/Timeline';
import MigrationMap from './pages/MigrationMap';

const queryClient = new QueryClient();

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div className="spinner" />
      </div>
    );
  }

  // Check both token in state and localStorage as fallback
  const hasToken = token || localStorage.getItem('token');
  
  if (!hasToken) {
    
  }

  return children;
};

// AdminRoute - Only allows ADMIN and SUPER_ADMIN roles
const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div className="spinner" />
      </div>
    );
  }

  // Check authentication
  const hasToken = token || localStorage.getItem('token');
  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  // Check role - get from user state or localStorage
  let userRole = user?.role;
  if (!userRole) {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        userRole = parsedUser.role;
      }
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
    }
  }

  // Only ADMIN and SUPER_ADMIN can access
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div className="spinner" />
      </div>
    );
  }

  // Check localStorage as fallback if user not in state yet
  const userData = user || (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  // Redirect based on user role
  if (userData) {
    if (userData.role === 'SUPER_ADMIN' || userData.isSuperAdmin) {
      return <Navigate to="/super-admin" replace />;
    } else if (userData.role === 'ADMIN') {
      return <Navigate to="/admin-dashboard" replace />;
    }
  }

  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/accept-invite/:token" element={<AcceptInvite />} />
            <Route
              path="/super-admin"
              element={
                <PrivateRoute>
                  <SuperAdmin />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <PrivateRoute>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/families"
              element={
                <PrivateRoute>
                  <Families />
                </PrivateRoute>
              }
            />
            <Route
              path="/members"
              element={
                <PrivateRoute>
                  <Members />
                </PrivateRoute>
              }
            />
            <Route
              path="/family-tree"
              element={
                <PrivateRoute>
                  <FamilyTree />
                </PrivateRoute>
              }
            />
            <Route
              path="/timeline"
              element={
                <PrivateRoute>
                  <Timeline />
                </PrivateRoute>
              }
            />
            <Route
              path="/migration-map"
              element={
                <PrivateRoute>
                  <MigrationMap />
                </PrivateRoute>
              }
            />
            <Route
              path="/memories"
              element={
                <PrivateRoute>
                  <Memories />
                </PrivateRoute>
              }
            />
            <Route
              path="/media"
              element={
                <PrivateRoute>
                  <MediaGallery />
                </PrivateRoute>
              }
            />
            <Route
              path="/events"
              element={
                <PrivateRoute>
                  <Events />
                </PrivateRoute>
              }
            />
            <Route
              path="/video-calls"
              element={
                <PrivateRoute>
                  <VideoCalls />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <PrivateRoute>
                  <Notifications />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <AdminPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/:familyId"
              element={
                <PrivateRoute>
                  <AdminPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/website-admin"
              element={
                <AdminRoute>
                  <WebsiteAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="/website-admin/:familyId"
              element={
                <AdminRoute>
                  <WebsiteAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="/bios"
              element={
                <PrivateRoute>
                  <Bios />
                </PrivateRoute>
              }
            />
            <Route
              path="/blog"
              element={
                <PrivateRoute>
                  <Blog />
                </PrivateRoute>
              }
            />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              element={
                <PrivateRoute>
                  <GoogleDriveCallback />
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
