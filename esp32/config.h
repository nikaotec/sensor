#ifndef CONFIG_H
#define CONFIG_H

// ---------- CONFIGURAÇÕES GERAIS ----------
const char* mqtt_server = "173.249.10.19";
const int mqtt_port = 1883;
const char* mqtt_user = "mqtt_SLUG_DA_EMPRESA";   // Substituir pelo mqtt_user do tenant
const char* mqtt_password = "SENHA_MQTT_TENANT";   // Substituir pelo mqtt_pass do tenant

// ---------- TENANT ----------
const char* tenant_slug = "SLUG_DA_EMPRESA";       // Substituir pelo slug da empresa

#endif
