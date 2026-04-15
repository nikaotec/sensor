
import { useState, useEffect, useRef } from 'react'
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
import { useMqttData } from './hooks/useMqttData'
import { X, AlertOctagon } from 'lucide-react'
import { NotificationProvider, useNotifications } from './contexts/NotificationContext'
import { supabase } from './supabase/config'

type Screen = 'login' | 'signup' | 'dashboard' | 'device-list' | 'device-details' | 'alerts' | 'reports' | 'settings' | 'manager-panel'

// Component to handle screen rendering and navigation inside the provider
const AppContent = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const { activeAlerts, addAlert, clearAlert } = useNotifications();
  const { currentTenant, setTenantId, availableTenants } = useTenant();
  const { currentUser, loading } = useAuth();

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Efeito para "desbloquear" o áudio no navegador com a primeira interação do usuário
  useEffect(() => {
    const unlockAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().then(() => {
          console.log("AudioContext ativado com sucesso");
        });
      }
      // Remove os listeners após desbloquear
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Função para tocar som de alerta (Padrão Sirene)
  const playAlertSound = () => {
    try {
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;

      // Forçar resume se necessário
      if (ctx.state === 'suspended') ctx.resume();

      const startTime = ctx.currentTime;

      // Função auxiliar para criar bipes da sirene
      const createTone = (freq: number, time: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sawtooth'; // Som mais "alerta"
        osc.frequency.setValueAtTime(freq, time);

        // Envelope suave para evitar estalidos
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.05);
        gain.gain.setValueAtTime(0.1, time + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.start(time);
        osc.stop(time + duration);
      };

      // Sirene de dois tons alternados
      createTone(880, startTime, 0.25);
      createTone(554, startTime + 0.25, 0.25);
      createTone(880, startTime + 0.5, 0.25);
      createTone(554, startTime + 0.75, 0.25);

    } catch (e) {
      console.warn('Erro na reprodução do áudio:', e);
    }
  };

  // Função para salvar alerta no Supabase (Auditoria)
  const logAlertToSupabase = async (alert: any) => {
    try {
      // Tentar encontrar o tenantId real baseado no nome da empresa vindo do MQTT
      let realTenantId = 'unknown';
      const foundTenant = availableTenants.find(t => t.name.toLowerCase() === alert.EMPRESA?.toLowerCase());
      if (foundTenant) {
        realTenantId = foundTenant.id;
      } else if (currentTenant && currentTenant.id !== 'all') {
        realTenantId = currentTenant.id;
      }

      await supabase.from('events').insert({
        device_id: alert.ID_DISPOSITIVO || 'unknown',
        tenant_id: realTenantId,
        type: 'alert',
        severity: 'critical',
        message: `${alert.TIPO?.replace('ALERTA_', '').replace('_', ' ')} detectado`,
        value: getAlertValue(alert),
        details: alert,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error("Erro ao salvar log de alerta no Supabase:", e);
    }
  };

  // Handler para mudança de nome de dispositivo via MQTT
  const handleDeviceNameChange = async (deviceId: string, newName: string) => {
    console.log('[Nome Alterado]', deviceId, '->', newName);
    alert(`Nome do dispositivo alterado para: ${newName}`);

    // Salvar no Supabase
    const { error } = await supabase
      .from('devices_status')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', deviceId);

    if (error) {
      console.error('Erro ao salvar novo nome no Supabase:', error);
    }
  };

  // Monitorar Alertas MQTT Globalmente
  useMqttData(
    currentTenant?.id || 'all',
    currentUser?.role,
    [],
    (alertPayload) => {
      playAlertSound();
      addAlert(alertPayload);
      logAlertToSupabase(alertPayload);
    },
    handleDeviceNameChange
  );

  const getAlertValue = (alert: any) => {
    if (alert.TIPO?.includes('BATERIA')) return `${alert.BATERIA}V`;
    if (alert.TIPO?.includes('TENSAO') || alert.TIPO?.includes('ENERGIA')) return `${alert.VOLTAGEM}V`;
    if (alert.TIPO?.includes('TEMP')) {
      // Tenta varios campos de temperatura
      const temp = alert.TEMP || alert.TEMP_ATUAL || alert.TEMP_C || alert.temperatura;
      return temp ? `${temp}°C` : 'N/A';
    }
    if (alert.TIPO?.includes('PORTA')) return alert.PORTA;
    return alert.TEMP || alert.TEMP_ATUAL || alert.TEMP_C || alert.VOLTAGEM || alert.BATERIA || 'N/A';
  };

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
          {availableTenants.length > 0 && <option value="all">TODOS</option>}
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark relative overflow-hidden">
      <TenantSwitcher />

      {/* Floating Alert System */}
      <div className="fixed top-6 right-6 z-[999] flex flex-col gap-3 w-80 max-w-[90vw]">
        {activeAlerts.map((alert, idx) => (
          <div key={`${alert.ID_DISPOSITIVO}-${idx}`} className="bg-[#1A1D17] border border-red-500/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(239,68,68,0.1)] flex gap-4 animate-in slide-in-from-right-10 duration-300 relative group overflow-hidden">
            <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none"></div>
            <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shrink-0">
              <AlertOctagon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Alerta Crítico</p>
              <h5 className="text-white text-xs font-bold leading-tight mb-1 truncate">{alert.DISPOSITIVO || 'Dispositivo'}</h5>
              <p className="text-slate-400 text-[10px] leading-snug">
                {alert.TIPO?.replace('ALERTA_', '').replace('_', ' ')}: <span className="text-red-400 font-bold">{getAlertValue(alert)}</span>
              </p>
            </div>
            <button
              onClick={() => clearAlert(idx)}
              className="size-6 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {currentScreen === 'dashboard' && (
        <Dashboard
          onDeviceClick={(deviceId) => {
            if (currentUser?.role === 'admin') {
              navigateToDeviceDetails(deviceId);
            } else {
              handleNavigation('device-list');
            }
          }}
          onNavigate={handleNavigation}
        />
      )}
      {currentScreen === 'login' && <Login onLogin={handleLogin} onSignUpClick={navigateToSignUp} />}
      {currentScreen === 'signup' && <SignUp onLoginClick={navigateToLogin} onSignUp={handleSignUp} />}
      {currentScreen === 'device-list' && <DeviceList onDeviceClick={navigateToDeviceDetails} onNavigate={handleNavigation} />}
      {currentScreen === 'device-details' && <DeviceDetails deviceId={selectedDeviceId || ''} onNavigate={handleNavigation} />}
      {currentScreen === 'alerts' && <Alerts onNavigate={handleNavigation} onDeviceClick={navigateToDeviceDetails} />}
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
        <NotificationProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </NotificationProvider>
      </TenantProvider>
    </AuthProvider>
  )
}

export default App
