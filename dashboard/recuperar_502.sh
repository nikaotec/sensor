#!/bin/bash
echo "=== Recuperação Nikaotech VPS (Erro 502) ==="
ssh root@109.123.240.215 << 'EOF'
  echo "1. Verificando processos PM2..."
  pm2 status
  
  echo "2. Tentando reiniciar nikaotech..."
  pm2 restart nikaotech || (cd /var/www/nikaotech && pm2 start server.js --name nikaotech)
  
  echo "3. Salvando configuração PM2..."
  pm2 save
  
  echo "4. Verificando se a porta local (3000 ou config) está respondendo..."
  curl -I http://localhost:3000 || curl -I http://localhost:8080
EOF
echo "=== Processo Concluído ==="
