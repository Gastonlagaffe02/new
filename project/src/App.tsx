import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Layout Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Page Components
import Dashboard from './components/Dashboard';
import TeamsManager from './components/teams/TeamsManager';
import PlayersManager from './components/players/PlayersManager';
import UsersManager from './components/users/UsersManager';
import LeaguesManager from './components/leagues/LeaguesManager';
import UserLeaguesManager from './components/leagues/UserLeaguesManager';
import MatchesManager from './components/matches/MatchesManager';
import AdminSimulateGames from './components/admin/AdminSimulateGames';
import MyTeam from './components/fantasy/MyTeam';
import TeamPointsHistory from './components/user/TeamPointsHistory';
import LoginForm from './components/auth/LoginForm';
import SignupForm from './components/auth/SignupForm';
import WorkInProgress from './components/WorkInProgress';

// Layout component that includes sidebar and header
function Layout({ children, isAdmin = true }: { children: React.ReactNode, isAdmin?: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Hide sidebar and header on auth pages
  if (['/login', '/signup'].includes(location.pathname)) {
    return <>{children}</>;
  }

  // If not admin, show work in progress page for admin routes
  if (!isAdmin && ['/teams', '/players', '/users', '/matches', '/admin/simulate-games'].includes(location.pathname)) {
    return <WorkInProgress />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isAdmin={isAdmin} />
      <div className="md:ml-0">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} user={user} />
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Main App Component with Router
function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

// Check if user is admin
function isAdminUser(user: any) {
  return user?.email === 'bousselemghassen03@gmail.com';
}

// Routes component that handles all the routing
function AppRoutes() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Determine if user is admin
  const isAdmin = user ? isAdminUser(user) : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!user ? <LoginForm /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <SignupForm /> : <Navigate to="/" />} />
        
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <Dashboard /> : <MyTeam />}
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                <MyTeam />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teampoint"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                <TeamPointsHistory />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <TeamsManager /> : <WorkInProgress />}
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/players"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <PlayersManager /> : <WorkInProgress />}
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <UsersManager /> : <WorkInProgress />}
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/leagues"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <LeaguesManager /> : <UserLeaguesManager />}
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/matches"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <MatchesManager /> : <WorkInProgress />}
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/simulate-games"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <AdminSimulateGames /> : <WorkInProgress />}
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* User-specific routes */}
        <Route
          path="/my-leagues"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                <UserLeaguesManager />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/fixtures"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                <WorkInProgress />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;