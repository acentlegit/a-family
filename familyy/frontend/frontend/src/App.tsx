import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Families from './pages/Families';
import Members from './pages/Members';
import FamilyTree from './pages/FamilyTree';
import Timeline from './pages/Timeline';
import MigrationMap from './pages/MigrationMap';
import Memories from './pages/Memories';
import MediaGallery from './pages/MediaGallery';
import Events from './pages/Events';
import VideoCalls from './pages/VideoCalls';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';

// Pages
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const AcceptInvite = React.lazy(() => import('./pages/AcceptInvite'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const SuperAdmin = React.lazy(() => import('./pages/SuperAdmin'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const GoogleDriveCallback = React.lazy(() => import('./pages/GoogleDriveCallback'));
const WebsiteAdmin = React.lazy(() => import('./pages/WebsiteAdmin'));
const Bios = React.lazy(() => import('./pages/Bios'));
const Blog = React.lazy(() => import('./pages/Blog'));
const Homepage = React.lazy(() => import('./pages/Homepage'));

const queryClient = new QueryClient();

const RouteLoadingFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '40vh'
    }}
  >
    <div className="spinner" />
  </div>
);

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
    return <Navigate to="/login" replace />;
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
          <Suspense fallback={<RouteLoadingFallback />}>
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
          </Suspense>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
