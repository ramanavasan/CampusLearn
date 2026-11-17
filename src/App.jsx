import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import StudentDashboard from './pages/StudentDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Notes from './pages/Notes'
import PreviousYearQuestions from './pages/PreviousYearQuestions'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — wrapped in the main layout (Navbar + Footer) */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected routes — wrapped in the dashboard layout (Sidebar) */}
        <Route element={<DashboardLayout role="student" />}>
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/pyq" element={<PreviousYearQuestions />} />
        </Route>

        <Route element={<DashboardLayout role="admin" />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

