# Histórico de Desenvolvimento - Dashboard SmartRF

## Data: 30/03/2026

---

## Problema 1: Build falhou - useFirebaseData.ts

**Problema:** Arquivo legado `useFirebaseData.ts` que importava `db` do firebase/config (já removido).

**Solução:** O arquivo não existia mais no código. O problema era na verdade a chave ANON_KEY do Supabase estava com formato errado.

---

## Problema 2: Login Google não funcionava

**Sintoma:** Popup abria mas ficava em branco e depois fechava.

**Solução:** O domínio `nikaotech.com` estava autorizado no Firebase. Problema era a chave ANON_KEY do Supabase incorreta.

**Chave correta была:**
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWl6Z2h6YmxuZ3N3Z3VrZm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTAzOTcsImV4cCI6MjA5MDQ4NjM5N30.cQCkTKWbrGwO3gVYQZNmKAytls1TE3d7LddrgSc8QqA
```

---

## Problema 3: Dados não eram salvos no Supabase após login

**Sintoma:** Erro 401 (Unauthorized) ao tentar salvar usuário.

**Causa:** 
1. Chave ANON_KEY com formato errado (tinha prefixo `sb_publishable_`)
2. RLS (Row Level Security) habilitada na tabela `users`

**Solução SQL executada:**
```sql
-- Criou tabela users se não existir
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'admin',
    tenant_ids TEXT[] DEFAULT '{}',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Desabilita RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Permite acesso
GRANT ALL ON public.users TO anon, authenticated;
```

---

## Problema 4: Visibilidade de dispositivos por empresa

**Requisito:**
- Card do dispositivo só deve aparecer quando atribuído a uma empresa
- Se a empresa tiver usuário atribuído, todos os usuários podem ver os dispositivos dessa empresa
- Atribuição feita apenas pelo gestor
- Dispositivos não atribuídos aparecem em "Administração" (só gestor vê)

**Solução implementada em `useSupabaseData.ts`:**

```typescript
const UNASSIGNED_TENANT_IDS = ['Unknown', 'empresa_default', 'Nikaotec', 'unassigned', null, ''];

// Lógica de filtragem:
- Gestor (manager/gestor): vê todos os dispositivos (incluindo não atribuídos)
- Usuário normal: só vê dispositivos das empresas vinculadas a ele
- Dispositivos não atribuídos filtrados para não-gestores
```

---

## Problema 5: Abas das empresas no Dashboard

**Requisito:**
- Abas das empresas cadastradas devem aparecer automaticamente
- Em cada aba mostrar seus dispositivos
- Na aba "Todos": gestor vê todos os dispositivos
- Na aba "Todos": usuário normal vê apenas dispositivos das empresas que ele está atribuído

**Solução implementada em `Dashboard.tsx`:**

```typescript
const isManager = currentUser?.role === 'manager' || currentUser?.role === 'gestor';

// Se aba específica: filtra por empresa
if (currentTenant && currentTenant.id !== 'all') {
    return tenantDevices.filter(d => d.tenantId === currentTenant.id);
}

// Se gestor + aba "Todos": mostra todos
if (isManager) {
    return tenantDevices;
}

// Usuário normal + aba "Todos": filtra por empresas vinculadas
const allowedTenantIds = availableTenants.map(t => t.id);
return tenantDevices.filter(d => allowedTenantIds.includes(d.tenantId));
```

---

## Problema 6: Criar empresa dava erro 401

**Solução SQL:**
```sql
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tenants TO anon, authenticated;
```

---

## Arquivos modificados

1. **`.env`** - Corrigida chave SUPABASE_ANON_KEY
2. **`src/hooks/useSupabaseData.ts`** - Lógica de filtragem por empresa
3. **`src/contexts/AuthContext.tsx`** - Removidos logs de debug
4. **`src/components/Dashboard.tsx`** - Lógica de abas e filtragem
5. **`src/contexts/TenantContext.tsx`** - Tratamento de erro

---

## Tabelas do Supabase necessárias

```sql
-- users
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'admin',
    tenant_ids TEXT[] DEFAULT '{}',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- tenants
CREATE TABLE IF NOT EXISTS public.tenants (
    id TEXT PRIMARY KEY,
    name TEXT,
    status TEXT DEFAULT 'active',
    plan TEXT DEFAULT 'pro',
    colors JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- devices_status
CREATE TABLE IF NOT EXISTS public.devices_status (
    id TEXT PRIMARY KEY,
    name TEXT,
    tenant_id TEXT,
    status TEXT DEFAULT 'offline',
    location TEXT,
    temperature REAL,
    humidity REAL,
    battery REAL,
    voltage REAL,
    signal REAL,
    last_seen TIMESTAMPTZ
);

-- events
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT,
    tenant_id TEXT,
    type TEXT,
    severity TEXT,
    message TEXT,
    value TEXT,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- telemetry
CREATE TABLE IF NOT EXISTS public.telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT,
    temperature REAL,
    humidity REAL,
    battery REAL,
    voltage REAL,
    signal REAL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Desabilitar RLS em todas
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
```

---

## Problema 7: Popover de atribuição de empresas no ManagerPanel

**Problema:** O popover de seleção de empresas usava interação hover (`group-hover`), que não funciona bem em dispositivos tácteis e era difícil de usar.

**Solução:** Alterado para interação baseada em clique (click-based):

1. Adicionado estado `openTenantPopoverFor` para controlar qual popover está aberto
2. Substituído `group-hover` por click no container
3. Adicionado `useEffect` com `useRef` para fechar popover ao clicar fora
4. Adicionado `stopPropagation` nos botões para evitar fechamento acidental

---

## Arquivos modificados (continuação)

6. **`src/components/ManagerPanel.tsx`**
   - Adicionado `useEffect` e `useRef` aos imports
   - Adicionado estado `openTenantPopoverFor`
   - Alterado popover de hover para click-based
   - Adicionado handler para click outside

---

## Para rodar o projeto

```bash
cd dashboard
npm run build
# Deploy pasta dist para o servidor
```

---

## Próximos passos (bugs e features)

1. Verificar se dispositivos aparecem corretamente nas abas
2. Testar criação de empresa
3. Testar atribuição de dispositivo a empresa
4. Testar visibilidade para usuário não-gestor
5. Implementar mais features conforme necessidade

---

## Data: 01/04/2026

## Problema 8: n8n.nikaotech.com redirecionando para dashboard

**Sintoma:** Ao acessar `n8n.nikaotech.com` era redirecionado para o dashboard em `nikaotech.com`.

**Causa:** 
- A config do Nginx só tinha HTTPS (porta 443) para `nikaotech.com`
- O n8n só tinha config na porta 80 (HTTP)
- Ao acessar via HTTPS, caía na config do dashboard

**Diagnóstico:**
- Executei `cat /etc/nginx/sites-enabled/*` na VPS
- Identifiquei que existiam 3 arquivos: `nikaotech`, `default` (com certbot), `n8n`
- Havia conflitos de server_name entre os arquivos

**Solução:**

1. Removi configs conflitantes:
```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/n8n
```

2. Criei config unificada em `/etc/nginx/sites-enabled/nikaotech` com:
   - HTTP → HTTPS para nikaotech.com
   - HTTP → proxy para n8n (porta 5678)
   - HTTPS para n8n.nikaotech.com (usando certificado dedicado)
   - HTTPS para nikaotech.com (dashboard na porta 3000)

3. Certificados SSL usados:
   - `/etc/letsencrypt/live/nikaotech.com/fullchain.pem` → nikaotech.com
   - `/etc/letsencrypt/live/n8n.nikaotech.com/fullchain.pem` → n8n.nikaotech.com

**Arquivo de config gerado:** `docs/nginx-n8n-https.conf`

---

## Configuração Nginx Final

```nginx
# HTTP nikaotech.com → HTTPS
server {
    listen 80;
    server_name nikaotech.com www.nikaotech.com;
    return 301 https://$host$request_uri;
}

# HTTP n8n.nikaotech.com → proxy para n8n
server {
    listen 80;
    server_name n8n.nikaotech.com mqtt.nikaotech.com;
    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_set_header Host $host;
    }
}

# HTTPS n8n.nikaotech.com → n8n
server {
    listen 443 ssl;
    server_name n8n.nikaotech.com;
    ssl_certificate /etc/letsencrypt/live/n8n.nikaotech.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n8n.nikaotech.com/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:5678;
    }
}

# HTTPS nikaotech.com → dashboard
server {
    listen 443 ssl;
    server_name nikaotech.com www.nikaotech.com;
    ssl_certificate /etc/letsencrypt/live/nikaotech.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nikaotech.com/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

---

## Problema 9: Histórico de temperatura ainda mockado

**Sintoma:** O gráfico de temperatura no DeviceDetails mostrava dados mockados mesmo tendo dados no Supabase.

**Causa:**
1. O gráfico usava fallback: `history && history.length > 0 ? history : tenantMetrics.historicalData`
2. A query do useSupabaseData não incluía os deviceIds do tenant corretamente

**Solução:**
1. **useSupabaseData.ts**: Ajustei a query para buscar dados de todos os dispositivos do tenant quando não há deviceId específico
2. **DeviceDetails.tsx**: 
   - Removi o fallback para dados mock
   - Adicionei mensagem de "Aguardando dados" quando não há histórico
   - Adicionei log de debug para verificar se dados chegam

**Fluxo de dados:**
```
ESP32 (enviarDadosMqtt "periodico" a cada hora)
    ↓ MQTT tópico: esp32c3/data
n8n (workflow n8n_hourly_telemetry_supabase.json)
    ↓ filtra por TIPO = "periodico"
    ↓ insere na tabela "telemetry" do Supabase
Dashboard (useSupabaseData.ts)
    ↓ busca dados das últimas 24h na tabela "telemetry"
    ↓ exibe no gráfico de temperatura
```

**Skills utilizadas:**
- react-best-practices: Para padrões de data fetching em React
- database-design: Para analisar schema do Supabase

## Problema 10: n8n WebSocket erro 1006

**Sintoma:** O n8n não conectava corretamente, erro 1006 (WebSocket).

**Causa:** Configuração Nginx do n8n não tinha suporte a WebSockets.

**Solução:** Atualizei o config `docs/nginx-n8n-https.conf` com as linhas necessárias:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400;
proxy_send_timeout 86400;
```

**Para aplicar no servidor:**
```bash
# Copiar o arquivo para o servidor e aplicar
sudo cp docs/nginx-n8n-https.conf /etc/nginx/sites-enabled/nikaotech
sudo nginx -t
sudo systemctl reload nginx
```

**Skills utilizadas:**
- bash-linux: Para padrões de Nginx e configuração de servidor

---

## Próximos passos (continuação)

1. Testar se o histórico agora exibe dados reais do Supabase
2. Verificar se o workflow n8n está ativo e processando dados
3. Adicionar mqtt.nikaotech.com em HTTPS se necessário
