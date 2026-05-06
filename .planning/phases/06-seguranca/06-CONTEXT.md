# Contexto — Fase 6: Segurança & Hardening

Atualmente, o sistema IoT Sensor Monitor possui as seguintes características de segurança:

1.  **Dashboard (Frontend)**: Utiliza `anon key` do Supabase. Autenticação baseada em Firebase (UID mapeado no Supabase).
2.  **Banco de Dados (Supabase)**: RLS habilitado, mas polícias definidas como `ALLOW ALL (true)`, permitindo que qualquer cliente leia/escreva em qualquer empresa (tenant).
3.  **Broker MQTT (EMQX)**: Autenticação baseada em senha (`built_in_database`) habilitada, mas dispositivos usam uma credencial global compartilhada (`esp32_device`).
4.  **Firmware (ESP32)**: OTA protegido por senha estática. Credenciais de Wi-Fi e MQTT hardcoded no `Config.h`.

### Objetivos da Fase 6
-   **Isolamento Multi-tenant**: Garantir que um usuário da "Empresa A" não consiga ver dados da "Empresa B".
*   **Hardening do Banco**: Substituir políticas permissivas por políticas baseadas em JWT do Supabase.
*   **Gestão de Segredos**: Propor a remoção de segredos do código-fonte e uso de variáveis de ambiente.
*   **Autenticação MQTT**: Melhorar a granularidade das permissões (ACLs) no broker.

### Riscos Identificados
-   **Vazamento de Dados**: Se a `anon key` for vazada, qualquer pessoa pode baixar todo o histórico de telemetria.
*   **Ataques de Injeção**: payloads MQTT não validados poderiam corromper o banco (mitigado parcialmente pela regra SQL, mas requer auditoria).
