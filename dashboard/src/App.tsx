
import { useState, useEffect } from 'react'
import Login from './components/Login'
import SignUp from './components/SignUp'
import Dashboard from './components/Dashboard'
import DeviceDetails from './components/DeviceDetails'
import Alerts from './components/Alerts'
import Reports from './components/Reports'
import DeviceList from './components/DeviceList'
import Settings from './components/Settings'
import ManagerPanel from './components/ManagerPanel'
import { TenantProvider, useTenant } from './contexts/TenantContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'

type Screen = 'login' | 'signup' | 'dashboard' | 'device-list' | 'device-details' | 'alerts' | 'reports' | 'settings' | 'manager-panel'

// Component to handle screen rendering and navigation inside the provider
const AppContent = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const { currentTenant, setTenantId, availableTenants } = useTenant();
  const { currentUser, loading } = useAuth();

  // Efeito para sincronizar a tela com o estado de autenticação (Logout automático)
  useEffect(() => {
    if (!loading && !currentUser) {
      if (currentScreen !== 'signup') {
        setCurrentScreen('login');
      }
    } else if (!loading && currentUser && (currentScreen === 'login' || currentScreen === 'signup')) {
      setCurrentScreen('dashboard');
    }
  }, [currentUser, loading, currentScreen]);

  const handleLogin = () => setCurrentScreen('dashboard')
  const handleSignUp = () => setCurrentScreen('dashboard')
  const navigateToLogin = () => setCurrentScreen('login')
  const navigateToSignUp = () => setCurrentScreen('signup')

  // Generic navigation handler for Sidebar
  const handleNavigation = (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel') => {
    setCurrentScreen(screen as any);
  }

  const navigateToDeviceDetails = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setCurrentScreen('device-details');
  }

  // Debug Tenant Switcher
  const TenantSwitcher = () => {
    if (!currentTenant) return null;
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-slate-800 p-2 rounded-lg shadow-lg border border-slate-700 flex gap-2 items-center opacity-50 hover:opacity-100 transition-opacity">
        <span className="text-xs text-slate-400">Tenant:</span>
        <select
          value={currentTenant.id}
          onChange={(e) => setTenantId(e.target.value)}
          className="bg-slate-700 text-white text-xs p-1 rounded border-none"
        >
          {availableTenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="animate-pulse text-slate-400 font-medium">Iniciando sistema...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <TenantSwitcher />
      {currentScreen === 'dashboard' && <Dashboard onDeviceClick={() => handleNavigation('device-list')} onNavigate={handleNavigation} />}
      {currentScreen === 'login' && <Login onLogin={handleLogin} onSignUpClick={navigateToSignUp} />}
      {currentScreen === 'signup' && <SignUp onLoginClick={navigateToLogin} onSignUp={handleSignUp} />}
      {currentScreen === 'device-list' && <DeviceList onDeviceClick={navigateToDeviceDetails} onNavigate={handleNavigation} />}
      {currentScreen === 'device-details' && <DeviceDetails deviceId={selectedDeviceId || ''} onNavigate={handleNavigation} />}
      {currentScreen === 'alerts' && <Alerts onNavigate={handleNavigation} />}
      {currentScreen === 'reports' && <Reports onNavigate={handleNavigation} />}
      {currentScreen === 'settings' && <Settings onNavigate={handleNavigation} />}
      {currentScreen === 'manager-panel' && <ManagerPanel onNavigate={handleNavigation} />}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </TenantProvider>
    </AuthProvider>
  )
}

export default App
