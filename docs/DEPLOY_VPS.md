# Publicação do Dashboard na VPS (nikaotech.com)

Estas instruções foram criadas para que você possa colocar o dashboard online na sua VPS de forma simples e direta, mantendo a recepção da telemetria funcionando.

## 1. Enviar os arquivos para a VPS
Envie a pasta `dashboard` para a sua VPS. 
**Aviso:** Não envie a pasta `node_modules` ou o diretório `.git`. Envie apenas o código.

## 2. Preparar o Servidor
Acesse a pasta do projeto via terminal na sua VPS (`cd caminho/para/dashboard`) e execute:

```bash
# 1. Instalar as dependências (incluindo express e cors)
npm install

# 2. "Buildar" o projeto para produção (gera a pasta dist)
npm run build
```

## 3. Rodar o Servidor
O projeto agora possui o arquivo `server.js`, que serve os arquivos estáticos compilados (da pasta `dist`) e **recria a API `/api/sensors`** que o Vite fazia localmente para salvar o sensor log em `telemetry.json`.

**Opção 1: Sem Proxy (Para testes)**
Você pode rodar o server.js diretamente na porta 4000:
```bash
npm start
```
E acessar via `http://www.nikaotech.com:4000`.

**Opção 2: Recomendada - Usar o PM2**
O PM2 mantém o servidor ligado (na porta 4000) e reinicia caso o servidor reinicie. 

```bash
# 1. Instalar PM2 globalmente
npm install -g pm2

# 2. Iniciar o projeto
pm2 start server.js --name "nikaotech-dashboard"

# 3. Salvar o script
pm2 save
pm2 startup
```

## 4. Liberação no Firewall (Importante sem Nginx)

Como o painel está rodando na porta 4000 e sem um proxy Nginx na frente, você precisará garantir que esta porta esteja **aberta** no firewall da sua hospedagem e no seu Ubuntu:

```bash
sudo ufw allow 4000/tcp
```

## Pronto!
O seu projeto agora servirá diretamente a aplicação para a web em `http://www.nikaotech.com:4000` e a nossa API Node em `http://www.nikaotech.com:4000/api/sensors` receberá a telemetria do ESP32/n8n perfeitamente!
