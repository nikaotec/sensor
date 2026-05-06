# CONVENTIONS.md — Sensor IoT Dashboard
<!-- last_mapped: 2026-05-05 -->

## Linguagem

- **TypeScript strict** no dashboard (tsconfig `strict: true`)
- **C++ Arduino** no firmware (sem namespaces, includes via `#ifndef`)
- Comentários em **português do Brasil** (variáveis, logs, UI)

---

## Estilo de Código (Dashboard)

### Componentes React
```tsx
// PascalCase + arquivo .tsx
// Props tipadas com interface inline ou named interface
const Dashboard = ({ onNavigate }: { onNavigate: (s: Screen) => void }) => {
  // Hooks no topo
  const [devices, setDevices] = useState<Device[]>([]);
  
  // Tailwind para estilização — sem CSS modules
  return <div className="min-h-screen bg-slate-900 text-white">...</div>;
};
export default Dashboard;
```

### Tailwind Design Tokens (tailwind.config.cjs)
```javascript
// Cores customizadas
colors: {
  primary: '...',    // azul principal
  background: {
    light: '...',
    dark: '...'
  }
}
```

### TypeScript
```typescript
// Interfaces para tipos de domínio (não type aliases)
export interface Device { id: string; name: string; ... }

// Const objects como enums (não TypeScript enum)
export const ConnectionState = {
  Disconnected: 'disconnected',
  Connected: 'connected',
} as const;
export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];

// Funções arrow para handlers
const handleDeviceClick = (id: string) => { ... };

// Retornos explícitos em métodos de classe (Use Cases, Repositories)
execute(input: Input): Result { ... }
```

### Módulos
```typescript
// ESM ("type": "module" no package.json)
import { supabase } from '../supabase/config';  // caminhos relativos com ../
import type { Device } from '../domain/entities/Device';  // type-only imports
```

---

## Padrões de Error Handling

### Use Cases / Repositories
```typescript
// Sem throws — retornar null ou array vazio em falha silenciosa
async getById(id: string): Promise<Device | null> {
  const { data, error } = await supabase.from('devices_status')...;
  if (error) return null;
  return data;
}
```

### Hooks
```typescript
// try/catch com console.error — nunca rethrow para o componente
try {
  await saveToSupabase(payload);
} catch (e) {
  console.error('Erro ao salvar log de alerta no Supabase:', e);
}
```

### MQTT Payload
```typescript
// Silenciar payloads JSON inválidos
private handleMessage = (topic: string, raw: Buffer): void => {
  try {
    const payload = JSON.parse(raw.toString());
    this.messageHandlers.forEach(h => h({ topic, payload }));
  } catch {
    // payload inválido — ignorar silenciosamente
  }
};
```

---

## Padrões Arquiteturais

### Singleton de Serviços de Infraestrutura
```typescript
// EmqxMqttService.ts — exportar instância global
export const emqxMqttService = new EmqxMqttService();
```

### Observer Pattern (MQTT)
```typescript
// Retornar função de cleanup (unsubscribe) nos listeners
onMessage(handler: (msg: MqttMessage) => void): () => void {
  this.messageHandlers.add(handler);
  return () => this.messageHandlers.delete(handler);
}
// No hook/componente:
useEffect(() => {
  const unsub = emqxMqttService.onMessage(handle);
  return unsub; // cleanup automático
}, []);
```

### Merge Seletivo de Telemetria
```typescript
// ProcessMqttUpdateUseCase — nunca sobrescrever com undefined
Object.keys(telemetry).forEach(key => {
  const val = (telemetry as any)[key];
  if (val !== undefined) {
    (mergedTelemetry as any)[key] = val;
  }
});
```

---

## Convenções de Log

### Dashboard
```typescript
// Prefixos com nome do serviço entre colchetes
console.info('[EmqxMqttService] ✅ Conectado ao broker EMQX');
console.error('[EmqxMqttService] ❌ Erro:', err.message);
console.warn('[EmqxMqttService] 🔌 Conexão encerrada. Agendando reconexão...');
// Emojis para facilitar scanning visual nos logs
```

### Firmware ESP32
```cpp
// Serial.println para debug (sem framework de logging)
Serial.print("[AlertManager] Alarme ativo: ");
Serial.println(alertType);
```

---

## Nomeclaturas de Tópicos MQTT

```
telemetria/{device_id}          # Telemetria principal (novo padrão)
esp32c3/data                    # Legado (manter por compatibilidade)
esp32c3/status/action           # Status do dispositivo
esp32c3/web/action              # Comandos dashboard → ESP32
esp32c3/web_status/action       # Confirmação de comandos
esp32c3/dashboard               # Dados para dashboard
nikaotec/#                      # Canal de alertas
```

---

## Firmware C++ (Convenções)

```cpp
// Macros em UPPER_SNAKE_CASE
#define MQTT_SERVER "mqtt.nikaotech.com"
#define ALERT_REPEAT 120000

// Structs com PascalCase
struct SystemSettings { ... };
struct RelayConfig { ... };

// Enums com prefixo do tipo
enum RelayFunc { RELAY_FUNC_OFF = 0, RELAY_FUNC_AUTO = 1, RELAY_FUNC_MANUAL = 2 };

// Funções em camelCase (Arduino style)
void setupMqtt() { ... }
void handleMqttMessage(topic, payload) { ... }
```
