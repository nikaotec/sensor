# Coding Conventions

**Analysis Date:** 2026-05-07

## Languages & Tooling

- **TypeScript** - Used in `evolution-api-main/` (v5.7.2) and `dashboard/` (v5.9.3)
- **JavaScript** - Used in Node.js server files, n8n workflow JSON, and ad-hoc scripts

## Naming Conventions

### Files

- **TypeScript classes/components:** PascalCase — `InstanceDto.ts`, `useMqttData.ts`
- **Routes/services/controllers:** PascalCase — `instance.router.ts`, `auth.service.ts`
- **Utils/helpers:** camelCase — `findBotByTrigger.ts`, `createJid.ts`
- **Config files:** camelCase or kebab-case — `env.config.ts`, `tsconfig.json`
- **Exceptions:** PascalCase with `.exception` suffix — `400.exception.ts`, `404.exception.ts`

### Variables & Functions

- **Functions:** camelCase — `formatPhone()`, `getLockedData()`
- **State variables:** camelCase — `mqttClient`, `isConnected`
- **Constants:** camelCase or UPPER_SNAKE — `MQTT_BROKER_URL`, `OFFLINE_TIMEOUT`
- **Class properties:** camelCase (TypeScript)
- **Hooks:** camelCase with `use` prefix — `useMqttData`, `useSupabaseData`

## Code Style

### TypeScript (evolution-api-main)

**Formatter:** Prettier
- Semicolons: `true`
- Single quotes: `true`
- Trailing commas: `all`
- Print width: `120`
- Arrow parens: `always`
- Tab width: `2`

**Linting:** ESLint with TypeScript support
- `@typescript-eslint/eslint-plugin`
- `eslint-plugin-prettier`
- `eslint-plugin-simple-import-sort`

**Import order (not enforced but observed):**
1. Node built-ins
2. External packages
3. Internal `@` aliased imports (config, utils, api)
4. Relative imports

### React/TypeScript (dashboard)

**Formatter:** ESLint flat config (v9)
- Uses `typescript-eslint`
- React Hooks plugin required
- React Refresh plugin for Vite

**No Prettier config observed** — relies on ESLint for formatting only.

## TypeScript Patterns

### Class-based DTOs

```typescript
export class InstanceDto extends IntegrationDto {
  instanceName: string;
  instanceId?: string;
  // ... optional fields
}
```

**Location:** `evolution-api-main/src/api/dto/instance.dto.ts`

### Functional React Hooks

```typescript
export const useMqttData = (
  tenantId: string | null,
  currentUserRole: string | undefined,
  initialDevices: Device[] = [],
  onAlert?: (payload: any) => void
) => {
  // state, effects, callbacks
  return { devices, isConnected, publish, updateDeviceLocal };
};
```

**Location:** `dashboard/src/hooks/useMqttData.ts`

### Express Router Pattern (RouterBroker)

```typescript
export class InstanceRouter extends RouterBroker {
  public readonly router: Router = Router();

  constructor(readonly configService: ConfigService, ...guards: RequestHandler[]) {
    super();
    this.router
      .post('/create', ...guards, async (req, res) => {
        const response = await this.dataValidate({...});
        return res.status(HttpStatus.CREATED).json(response);
      });
  }
}
```

**Location:** `evolution-api-main/src/api/routes/instance.router.ts`

## Error Handling

### Custom Exceptions

Exception classes throw plain objects with status, error, and message fields:

```typescript
// 400.exception.ts
export class BadRequestException {
  constructor(...objectError: any[]) {
    throw {
      status: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: objectError.length > 0 ? objectError : undefined,
    };
  }
}
```

**Available exceptions:** `400.exception.ts`, `401.exception.ts`, `403.exception.ts`, `404.exception.ts`, `500.exception.ts`
**Location:** `evolution-api-main/src/exceptions/`

### Global Error Middleware

**Location:** `evolution-api-main/src/main.ts` (lines 67-126)

- Catches all errors and sends JSON with `{ status, error, response: { message } }`
- Sends webhook on errors if configured
- 404 catch-all for unmatched routes

### Try/Catch Pattern

```javascript
try {
  const data = req.body;
  // process
} catch (error) {
  console.error('Erro na API:', error);
  res.status(400).send('Invalid request');
}
```

**Location:** `dashboard/server.js` (lines 99-156)

## Logging

**Framework:** Pino (evolution-api-main)
- Imported via `import { Logger } from '@config/logger.config'`

**Console:** Used in dashboard/Node scripts
- `console.log()` for info
- `console.error()` for errors
- Emojis in log prefixes: `🗑️`, `✅`, `❌`, `🚀`, `📡`

```typescript
const logger = new Logger('SERVER');
logger.info('Provider:Files - ON');
logger.error(errorData);
```

## Comments

**Inline comments:** Used sparingly for non-obvious logic:

```typescript
// Ignore messages de display (MENSAGEM_DISPLAY)
// não são telemetria e podem criar cards fantasmas após reset.
if (payload.TIPO === 'MENSAGEM_DISPLAY') {
  return;
}
```

**TODO markers found:**
- `evolution-api-main/src/api/routes/chat.router.ts` — `// TODO: corrigir updateMessage para medias tambem`
- `evolution-api-main/src/api/routes/sendMessage.router.ts` — `// TODO: Revisar funcionamento do envio de Status`

## Module Design

### Barrel Exports (index pattern)

```typescript
// src/exceptions/index.ts
export * from './400.exception';
export * from './401.exception';
// ...
```

**Location:** `evolution-api-main/src/exceptions/index.ts`, `evolution-api-main/src/api/routes/index.router.ts`

### Abstract Base Classes

- `RouterBroker` — base for all routers
- `AbstractCache`, `AbstractRepository` — base patterns

**Location:** `evolution-api-main/src/api/abstract/`

### Path Aliases (tsconfig.json)

```json
{
  "paths": {
    "@api/*": ["src/api/*"],
    "@config/*": ["src/config/*"],
    "@utils/*": ["src/utils/*"],
    "@validate/*": ["src/validate/*"]
  }
}
```

---

*Convention analysis: 2026-05-07*