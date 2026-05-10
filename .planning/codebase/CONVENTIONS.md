# CONVENTIONS - Code Style & Patterns

**Last Mapped:** 2026-05-09  
**Project:** IoT Sensor Monitoring System

## TypeScript Conventions

### Type Definitions
```typescript
// Preferred: explicit types for props and state
type Screen = 'login' | 'signup' | 'dashboard' | 'device-details'

// Interface for complex objects
interface DeviceData {
  id: string
  name: string
  status: 'online' | 'offline'
  temperature?: number
}
```

### React Component Patterns
```typescript
// Props with destructuring
interface Props {
  onDeviceClick: (deviceId: string) => void
  onNavigate: (screen: Screen) => void
}

const DeviceList = ({ onDeviceClick, onNavigate }: Props) => { ... }
```

## React Patterns

### Context Provider Pattern
```typescript
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)

  const login = async (email: string, password: string) => { ... }

  return (
    <AuthContext.Provider value={{ user, login }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Custom Hook Pattern
```typescript
export const useMqttData = (
  tenantId: string,
  userRole: string,
  enabledAlerts: string[],
  onAlert: (payload: AlertPayload) => void,
  onDeviceNameChange?: (deviceId: string, newName: string) => void
) => {
  // Implementation
  useEffect(() => { /* MQTT subscription */ }, [tenantId])
}
```

### State Management Pattern
```typescript
// Screen navigation
const [currentScreen, setCurrentScreen] = useState<Screen>('login')
const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

// Async handlers with error handling
const handleLogin = async () => {
  try {
    const result = await authService.login(email, password)
    setCurrentScreen('dashboard')
  } catch (error) {
    console.error('Login failed:', error)
  }
}
```

## Error Handling

```typescript
// Try-catch with console logging
try {
  const { error } = await supabase.from('events').insert(data)
  if (error) console.error('Insert failed:', error)
} catch (e) {
  console.error('Unexpected error:', e)
}

// Error boundary component
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }
}
```

## Styling (Tailwind)

### Color System
```typescript
// Dark theme primary colors
bg-background-dark    // Slate-900 equivalent
border-primary        // Custom primary border
text-primary          // Primary text
```

### Responsive Design
```tsx
// Mobile-first with breakpoints
<div className="w-full md:w-1/2 lg:w-1/3">
  <Card className="p-4 sm:p-6 lg:p-8" />
</div>
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `DeviceCard.tsx` |
| Hooks | camelCase + use prefix | `useMqttData.ts` |
| Services | PascalCase | `TelemetryService.ts` |
| Utils | camelCase | `statusUtils.ts` |
| Types | PascalCase | `DeviceData` |
| Contexts | PascalCase | `AuthContext.tsx` |
| Props | camelCase | `onDeviceClick` |
| State setters | set + Name | `setCurrentScreen` |

## File Organization

```
src/
├── components/     # UI components
├── contexts/       # React contexts
├── hooks/          # Custom hooks
├── services/       # Business logic
├── utils/          # Pure utility functions
├── data/           # Static data
├── templates/      # Component templates
└── tests/          # Test files
```

## MQTT Message Format

```typescript
// Expected payload structure
interface MqttPayload {
  TIPO: 'relatorio_diario' | 'periodico' | 'ALERTA_*'
  ID_DISPOSITIVO: string  // MAC address
  TEMP_C: number
  TEMP_MAX?: number
  TEMP_MIN?: number
  UMIDADE?: number
  BATERIA?: number
  VOLTAGEM?: number
  EMPRESA?: string
}
```

## Supabase Patterns

```typescript
// Fetch with error handling
const { data, error } = await supabase
  .from('devices_status')
  .select('*')
  .eq('tenant_id', tenantId)

if (error) console.error(error)

// Realtime subscription
supabase
  .channel('db-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'devices_status' }, callback)
  .subscribe()
```

## Import Organization

```typescript
// 1. React core
import { useState, useEffect, useRef } from 'react'

// 2. External libraries
import { X, AlertOctagon } from 'lucide-react'

// 3. Internal components
import Login from './components/Login'
import Dashboard from './components/Dashboard'

// 4. Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext'

// 5. Hooks
import { useMqttData } from './hooks/useMqttData'

// 6. Services
import { supabase } from './supabase/config'
```