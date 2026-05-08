# Conventions

**Mapped:** 2026-05-08

## Code Style

### ESP32 (Arduino C++)

**Formatting:**
- 2-space indentation
- Braces on same line
- Max line length: 120 chars

**Naming:**
- Classes: `PascalCase`
- Methods: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Variables: `camelCase`, type prefixes optional

**Patterns:**
```cpp
// Class definition
class AlertManager {
public:
    AlertStatus getStatus() const;
    void checkAlert(float value);
private:
    AlertStatus _status = ALERT_NONE;
    unsigned long _lastAlertTime = 0;
};

// State machine pattern
enum AlertStatus {
    ALERT_NONE,
    ALERT_STARTED,
    ALERT_REPEATED,
    ALERT_NORMALIZED
};
```

**Error Handling:**
- Return codes for functions
- Serial debug output for errors
- Reset on unrecoverable errors

### React Dashboard (TypeScript)

**Formatting:**
- ESLint + Prettier defaults
- 2-space indentation
- Single quotes for strings

**Component Patterns:**
```tsx
interface DeviceProps {
  deviceId: string;
  onSelect: (id: string) => void;
}

export function DeviceCard({ deviceId, onSelect }: DeviceProps) {
  return (
    <div className="device-card" onClick={() => onSelect(deviceId)}>
      <DeviceHeader id={deviceId} />
      <DeviceTelemetryCard id={deviceId} />
    </div>
  );
}
```

**Hook Patterns:**
```typescript
export function useMqttData() {
  const [data, setData] = useState<MqttMessage[]>([]);
  
  useEffect(() => {
    const client = mqtt.connect(BROKER_URL);
    client.subscribe('esp32c3/#');
    client.on('message', (topic, payload) => {
      setData(prev => [...prev, JSON.parse(payload.toString())]);
    });
    return () => client.end();
  }, []);
  
  return data;
}
```

**Type Patterns:**
```typescript
interface TelemetryData {
  TEMP_C: number;
  UMIDADE: number;
  BATERIA: number;
  VOLTAGEM: number;
}

interface DeviceStatus {
  id: string;
  name: string;
  temperature: number;
  status: 'online' | 'offline' | 'warning';
}
```

### n8n Workflows (JSON)

**Node Naming:** `snake_case descriptive`
**Variable Access:** `$json.fieldName`, `$env.VAR_NAME`
**Expression Syntax:** `{{ $json.value }}`

**Common Patterns:**
```javascript
// Code node
const data = $json;
return data.items.map(item => ({
  json: {
    ...item,
    processed: true
  }
}));

// Expression
{{ $json.temperature > $json.temp_max ? 'HIGH' : 'NORMAL' }}
```

## Patterns

### ESP32 MQTT Callback
```cpp
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<512> doc;
  deserializeJson(doc, payload, length);
  // Process message
}
```

### Alert Debounce
```cpp
bool checkDebounce(unsigned long now, unsigned long lastTime, int interval) {
  return (now - lastTime) >= interval;
}
```

### React Context
```tsx
const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  
  return (
    <TenantContext.Provider value={{ tenants, setTenants }}>
      {children}
    </TenantContext.Provider>
  );
}
```

## State Management

| Layer | Pattern |
|-------|---------|
| ESP32 | Global variables + class instances |
| React | Context API (Auth, Tenant, Notification) |
| n8n | Node-level state (no persistence) |
| Supabase | RLS + row ownership |

## File Organization

| Type | Pattern |
|------|---------|
| Components | `components/Name.tsx` |
| Hooks | `hooks/useName.ts` |
| Context | `contexts/NameContext.tsx` |
| Utils | `utils/name.ts` |
| Types | `data/types.ts` or inline |

## Comments

- ESP32: Minimal, only for complex logic
- React: JSDoc for exports, inline for non-obvious
- n8n: Node descriptions only

## Testing Conventions

- **Unit tests:** `*.test.ts` for hooks/services
- **Setup:** `tests/setup.ts` for test utilities
- **Mock data:** `data/mockData.ts`