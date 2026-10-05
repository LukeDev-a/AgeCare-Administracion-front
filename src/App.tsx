import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { ProtectedRoute } from './layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ComercialPage } from './pages/comercial/ComercialPage';
import { OperativoPage } from './pages/operativo/OperativoPage';
import { UsuariosPage } from './pages/usuarios/UsuariosPage';
import { FuncionalPage } from './pages/funcional/FuncionalPage';
import { TicketsPage } from './pages/tickets/TicketsPage';
import { ContentPage } from './pages/contenido/ContentPage';
import { MarketplacePage } from './pages/marketplace/MarketplacePage';
import { ModerationPage } from './pages/moderacion/ModerationPage';
import { JuegosPage } from './pages/juegos/JuegosPage';
import { AuditoriaPage } from './pages/auditoria/AuditoriaPage';
import { StaffPage } from './pages/cuentas/StaffPage';
import { InvitationPage } from './pages/acceso/InvitationPage';
import { MfaEnrollmentPage } from './pages/acceso/MfaEnrollmentPage';
import { SecurityPage } from './pages/acceso/SecurityPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/aceptar-invitacion" element={<InvitationPage />} />
      <Route path="/configurar-mfa" element={<MfaEnrollmentPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/comercial" replace />} />
        <Route path="/comercial" element={<ComercialPage />} />
        <Route path="/operativo" element={<OperativoPage />} />
        <Route path="/usuarios" element={<UsuariosPage />} /> 
        <Route path="/funcional" element={<FuncionalPage />} />
        <Route path="/juegos" element={<JuegosPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/contenido" element={<ContentPage />} />
        <Route path="/catalogos" element={<MarketplacePage />} />
        <Route path="/moderacion" element={<ModerationPage />} />
        <Route path="/auditoria" element={<ProtectedRoute adminOnly><AuditoriaPage /></ProtectedRoute>} />
        <Route path="/cuentas" element={<ProtectedRoute adminOnly><StaffPage /></ProtectedRoute>} />
        <Route path="/seguridad" element={<SecurityPage />} />
        <Route path="/config" element={<PlaceholderPage icon="⚙️" title="Configuración" />} />
        <Route path="/legales" element={<PlaceholderPage icon="📜" title="Legales y privacidad" />} />
      </Route>
    </Routes>
  );
}
