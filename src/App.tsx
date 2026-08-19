import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { PublicHome } from './pages/PublicHome'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { Logbook } from './pages/Logbook'
import { LogbookForm } from './pages/LogbookForm'
import { LogbookDetail } from './pages/LogbookDetail'
import { ObservationForm } from './pages/ObservationForm'
import { ObservationDetail } from './pages/ObservationDetail'
import { Vehicles } from './pages/Vehicles'
import { VehicleDetail } from './pages/VehicleDetail'
import { SearchPage } from './pages/SearchPage'
import { Profile } from './pages/Profile'
import { AvatarEditor } from './pages/AvatarEditor'
import { Calendar } from './pages/Calendar'
import { ShiftDetail } from './pages/ShiftDetail'
import { Admin } from './pages/Admin'

export function App() {
  return (
    <Routes>
      {/* Publika sidor */}
      <Route path="/" element={<PublicHome />} />
      <Route path="/glomt-losenord" element={<ForgotPassword />} />
      <Route path="/aterstall-losenord" element={<ResetPassword />} />

      {/* Skyddade sidor med gemensam layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/hem" element={<Dashboard />} />
        <Route path="/loggbok" element={<Logbook />} />
        <Route path="/loggbok/ny" element={<LogbookForm />} />
        <Route path="/loggbok/:id" element={<LogbookDetail />} />
        <Route path="/loggbok/:id/redigera" element={<LogbookForm />} />
        <Route path="/observation/ny" element={<ObservationForm />} />
        <Route path="/observation/:id" element={<ObservationDetail />} />
        <Route path="/observation/:id/redigera" element={<ObservationForm />} />
        <Route path="/fordon" element={<Vehicles />} />
        <Route path="/fordon/:id" element={<VehicleDetail />} />
        <Route path="/sok" element={<SearchPage />} />
        <Route path="/kalender" element={<Calendar />} />
        <Route path="/kalender/pass/:id" element={<ShiftDetail />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/profil/avatar" element={<AvatarEditor />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/hem" replace />} />
    </Routes>
  )
}
