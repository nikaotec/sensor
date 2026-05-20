#!/bin/bash
echo "=== Diagnóstico Nikaotech VPS ==="
date
echo "Usuário atual: $(whoami)"
echo "Diretório: $(pwd)"

echo -e "\n1. Verificando pasta /var/www/nikaotech:"
ls -ld /var/www/nikaotech
ls -F /var/www/nikaotech | head -n 10

echo -e "\n2. Verificando PM2:"
pm2 status

echo -e "\n3. Verificando logs recentes do PM2 (nikaotech):"
pm2 logs nikaotech --lines 20 --no-colors --err

echo -e "\n4. Verificando espaço em disco:"
df -h / | grep /

echo -e "\n5. Verificando memória:"
free -h

echo "=== Fim do Diagnóstico ==="
