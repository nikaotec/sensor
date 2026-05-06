# Plano de Execução — Fase 6: Segurança & Hardening

Garantir o isolamento de dados e a segurança das comunicações entre Dashboard, Supabase e EMQX.

## Proposed Changes

### 1. Banco de Dados (Supabase RLS)
- **Desativar Políticas Permissivas**: Remover as políticas que utilizam `true`.
- **Implementar Multi-tenancy**:
  - Criar função auxiliar `check_user_tenant(tenant_id)` para validar se o `auth.uid()` tem acesso ao tenant solicitado.
  - Aplicar políticas restritivas nas tabelas:
    - `tenants`: Apenas para usuários que possuam o ID no array `tenant_ids`.
    - `devices_status`, `telemetry`, `events`: Filtrado pelo `tenant_id` do registro.
    - `users`: Usuário só pode ler seu próprio perfil (ou administradores globais).

### 2. Dashboard (Frontend Segredos)
- **Migração para Variáveis de Ambiente**:
  - Garantir que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` sejam carregadas via `.env` (não versionado).
- **Mocks de Teste**: Garantir que as credenciais nos mocks sejam genéricas.

### 3. Broker MQTT (EMQX)
- **Recomendação de Autenticação por Cliente**:
  - Sugerir a criação de usuários únicos por `tenant_id` ou por `device_id` no EMQX para isolar o tráfego.
  - Implementar ACLs (Access Control Lists) para garantir que um dispositivo `tenant_A` só publique/subscreva em tópicos `telemetria/tenant_A/#`.

### 4. Firmware (Hardening)
- **Remoção de PII**: Garantir que logs seriais não exponham senhas por padrão.
- **OTA Hardening**: Sugestão de rotação da senha do OTA via comando remoto (EEPROM).

## Verification Plan

### Automated Tests
- Criar teste de integração no Dashboard simulando um usuário logado tentando acessar dados de outro tenant (deve retornar vazio ou erro).

### Manual Verification
- Acessar o Dashboard como "Empresa A" e verificar se nenhum dispositivo da "Empresa B" aparece na listagem.
- Tentar publicar no MQTT usando uma credencial inválida e validar o bloqueio.
