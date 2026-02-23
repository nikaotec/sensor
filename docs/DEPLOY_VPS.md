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

**Opção 1: Direto na Porta 80**
Se a sua VPS não tiver outro servidor web instalado (Nginx/Apache), você pode rodar o server.js diretamente na porta 80, que é a padrão para internet (permitindo acessar via `www.nikaotech.com` sem informar porta).
No Linux, portas menores que 1024 podem requerer permissão root (`sudo`):
```bash
sudo npm start
```

**Opção 2: Recomendada - Usar o PM2**
O PM2 mantém o servidor ligado em background e reinicia caso dê erro.
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar o projeto
sudo pm2 start server.js --name "nikaotech-dashboard"

# Salvar o script de inicialização do PM2 (para iniciar com o OS)
pm2 save
pm2 startup
```

## 4. (Avançado) Usando Nginx como Reverse Proxy
Se a VPS já possui sites ativos na porta 80 via Nginx, inicie o dashboard em outra porta e aponte o Nginx para lá:
```bash
PORT=3000 pm2 start server.js --name "nikaotech-dashboard"
```
E na configuração do seu domínio no Nginx (`/etc/nginx/sites-available/nikaotech.com`):
```nginx
server {
    listen 80;
    server_name www.nikaotech.com nikaotech.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Pronto!
O seu projeto agora roda como uma API e Frontend estático num ambiente unificado Express. O ESP32 continuará mandando o POST para `/api/sensors` mas agora em `www.nikaotech.com/api/sensors`.
