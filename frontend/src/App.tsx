import React, { createContext, useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Contractors from './pages/Contractors';
import Settings from './pages/Settings';
import Login from './pages/Login';
import useAuth from './hooks/useAuth';
import { User } from './types';
import './App.css';

// Auth Context
interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

// Protected Route component
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, loading } = useAuthContext();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Ładowanie...</p>
      </div>
    );
  }
  
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
};

// Main Layout with Navbar and Sidebar
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app">
      <Navbar />
      <div className="main-content">
        <Sidebar />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      <Router>
        <Routes>
          <Route path="/login" element={
            auth.isLoggedIn ? <Navigate to="/" replace /> : <Login />
          } />
          <Route path="/" element={
            <PrivateRoute>
              <MainLayout><Dashboard /></MainLayout>
            </PrivateRoute>
          } />
          <Route path="/invoices" element={
            <PrivateRoute>
              <MainLayout><Invoices /></MainLayout>
            </PrivateRoute>
          } />
          <Route path="/contractors" element={
            <PrivateRoute>
              <MainLayout><Contractors /></MainLayout>
            </PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute>
              <MainLayout><Settings /></MainLayout>
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;