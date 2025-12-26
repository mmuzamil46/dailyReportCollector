import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Services from './pages/Services';
import Reports from './pages/Reports';
import RegisterUser from './pages/RegisterUser';
import AllReports from './pages/AllReports';
import UpdateService from './pages/UpdateService';
import AdminDashboard from './pages/AdminDashboard';
import GenerateReport from './pages/GenerateReport';
import DailyWoredaReport from './pages/DailyWoredaReport';
import Login from './components/Login';
import { useContext } from 'react';
import PublicDisplay from './pages/PublicDisplay';
import DataAnalysisReport from './pages/DataAnalysisReport';
import PlanTable from './pages/PlanTable';
import AnalysisDashboard from './pages/AnalysisDashboard';
import CardManagement from './pages/CardManagement';
import NotificationAlert from './components/NotificationAlert';
import AdminNotification from './pages/AdminNotification';

function ProtectedAdminRoute({ children }) {
  const { user } = useContext(AuthContext);
  return user && (user.role === 'Admin' || user.role === 'Staff') ? children : <Login />;
}

function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  return user ? children : <Login />;
}

function App() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/display';
  return (
    <AuthProvider>
      <NotificationAlert />
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/services"
          element={
            <ProtectedAdminRoute>
              <Services />
            </ProtectedAdminRoute>
          }
        />
        <Route path="/reports" element={<Reports />} />
        <Route path="/daily-report" element={<DailyWoredaReport />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/plan-table" element={<PlanTable />} />
        <Route path="/analysis" element={<AnalysisDashboard />} />
        <Route
          path="/services/:id/edit"
          element={
            <ProtectedAdminRoute>
              <UpdateService />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/users/register"
          element={
            <ProtectedAdminRoute>
              <RegisterUser />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/generate-report"
          element={
            <ProtectedRoute>
              <GenerateReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/all-reports"
          element={
            <ProtectedAdminRoute>
              <AllReports />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/notifications/manage"
          element={
            <ProtectedAdminRoute>
              <AdminNotification />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/data-analysis"
          element={
            <ProtectedAdminRoute>
              <DataAnalysisReport />
            </ProtectedAdminRoute>
          }
        />
        <Route path="/display" element={<PublicDisplay />} />
        <Route 
          path="/cards" 
          element={
            <ProtectedAdminRoute>
              <CardManagement />
            </ProtectedAdminRoute>
          } 
        />
      </Routes>
    </AuthProvider>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}