import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import AppLayout from './components/layout/AppLayout'

import Landing    from './pages/Landing'
import Register   from './pages/Register'
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import PostRide   from './pages/PostRide'
import FindRide   from './pages/FindRide'
import Calculator from './pages/Calculator'
import Profile    from './pages/Profile'
import Safety     from './pages/Safety'
import Admin      from './pages/Admin'
import MyRides    from './pages/MyRides'
import Chat       from './pages/Chat'
import Tracking   from './pages/Tracking'

export default function App() {
  useAuth() // Initializes auth state globally

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/"         element={<><Navbar /><Landing /></>} />
      <Route path="/safety"   element={<><Navbar /><Safety /></>} />
      <Route path="/login"    element={<><Navbar /><Login /></>} />
      <Route path="/register" element={<><Navbar /><Register /></>} />

      {/* Protected routes with sidebar layout */}
      <Route path="/dashboard"  element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/post-ride"  element={<ProtectedRoute><AppLayout><PostRide /></AppLayout></ProtectedRoute>} />
      <Route path="/find-ride"  element={<ProtectedRoute><AppLayout><FindRide /></AppLayout></ProtectedRoute>} />
      <Route path="/calculator" element={<ProtectedRoute><AppLayout><Calculator /></AppLayout></ProtectedRoute>} />
      <Route path="/profile"    element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
      <Route path="/my-rides"   element={<ProtectedRoute><AppLayout><MyRides /></AppLayout></ProtectedRoute>} />
      <Route path="/admin"      element={<ProtectedRoute adminOnly><AppLayout><Admin /></AppLayout></ProtectedRoute>} />

      {/* Full-screen protected routes (no sidebar) */}
      <Route path="/chat/:rideId"     element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/tracking/:rideId" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
