import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Thermometer, 
  Settings, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Power, 
  History,
  RefreshCw,
  LayoutDashboard
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const API_URL = 'http://localhost:3001/api';

const App = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/status`);
      setDevices(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  };

  const fetchHistory = async (key) => {
    try {
      const res = await axios.get(`${API_URL}/history/${key}?limit=50`);
      setHistory(res.data.reverse());
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchHistory(selectedDevice.device_key);
    }
  }, [selectedDevice]);

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-white p-6 md:p-10">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">IoT Sensor Health</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            System Live
          </span>
          <button 
            onClick={fetchData}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Device List */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-lg font-medium text-slate-400 mb-4">Dispositivos Ativos</h2>
          {devices.map((device) => (
            <div 
              key={device.device_key}
              onClick={() => setSelectedDevice(device)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                selectedDevice?.device_key === device.device_key 
                ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{device.name}</h3>
                  <p className="text-sm text-slate-400">{device.location}</p>
                </div>
                <div className={`p-2 rounded-lg ${device.is_alarm ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                  {device.is_alarm ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                </div>
              </div>

              <div className="flex items-end gap-2 mb-6">
                <span className="text-4xl font-bold">{device.temperature}°</span>
                <span className="text-xl text-slate-400 mb-1">C</span>
              </div>

              <div className="flex justify-between text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Power size={14} className={device.relay_status === 'LIGADO' ? 'text-blue-400' : 'text-slate-600'} />
                  {device.relay_status}
                </div>
                <div>ID: {device.device_key}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Device Detail */}
        <div className="lg:col-span-2">
          {selectedDevice ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl h-full">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-800 rounded-2xl">
                    <History className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Histórico de Temperatura</h2>
                    <p className="text-slate-400">Dados das últimas 50 leituras</p>
                  </div>
                </div>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="timestamp" 
                      hide 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#3b82f6' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorTemp)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                {[
                  { label: 'Status Relé', value: selectedDevice.relay_status, icon: <Power size={18} /> },
                  { label: 'Última Leitura', value: new Date(selectedDevice.timestamp).toLocaleTimeString(), icon: <Activity size={18} /> },
                  { label: 'Variação 1h', value: '0.4°C', icon: <Thermometer size={18} /> },
                  { label: 'Localização', value: selectedDevice.location, icon: <Settings size={18} /> },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-800/50 p-4 rounded-2xl">
                    <div className="text-slate-500 mb-2">{stat.icon}</div>
                    <div className="text-xs text-slate-400 mb-1">{stat.label}</div>
                    <div className="font-semibold text-sm">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
              <LayoutDashboard size={48} className="mb-4 opacity-20" />
              <p>Selecione um dispositivo para ver detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
