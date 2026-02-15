import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LocationsPage from './pages/LocationsPage';
import DevicesPage from './pages/DevicesPage';
import SettingsPage from './pages/SettingsPage';

function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes with sidebar layout */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route
              path="/users"
              element={
                <AdminRoute>
                  <SettingsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <AdminRoute>
                  <SettingsPage />
                </AdminRoute>
              }
            />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
