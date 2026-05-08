import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthModal } from './components/modals/AuthModal.jsx'
import { SettingsModal } from './components/modals/SettingsModal.jsx'
import { NotificationStack } from './components/ui/NotificationStack.jsx'
import { AppProvider, useApp } from './context/AppContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import { GroupLobbyPage } from './pages/GroupLobbyPage.jsx'
import { GroupRoomPage } from './pages/GroupRoomPage.jsx'
import { LandingPage } from './pages/LandingPage.jsx'
import { SoloPage } from './pages/SoloPage.jsx'

function GlobalOverlays() {
  const { state, actions } = useApp()

  return (
    <>
      <AuthModal key={`auth-${state.authModal.mode}-${state.authModal.open ? 'open' : 'closed'}`} />
      <SettingsModal key={`settings-${state.settingsModalOpen ? 'open' : 'closed'}`} />
      <NotificationStack notifications={state.notifications} onDismiss={actions.removeNotification} />
    </>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/solo" element={<SoloPage />} />
      <Route path="/group" element={<GroupLobbyPage />} />
      <Route path="/group/:roomCode" element={<GroupRoomPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <SocketProvider>
        <BrowserRouter>
          <AppRoutes />
          <GlobalOverlays />
        </BrowserRouter>
      </SocketProvider>
    </AppProvider>
  )
}
