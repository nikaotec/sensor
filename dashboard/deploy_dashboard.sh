#!/bin/bash

# Sair imediatamente se um comando falhar
set -e

# --- Configurações --- 
REMOTE_USER="root"
REMOTE_HOST="109.123.240.215"
REMOTE_PATH="/var/www/nikaotech"
APP_NAME="dashboard"
BUILD_DIR="dist"
ARCHIVE_NAME="${APP_NAME}.tar.gz"

# --- 1. Build da aplicação --- 
echo "Iniciando o build da aplicação..."
npm run build

# Verificar se o diretório de build foi criado
if [ ! -d "./${BUILD_DIR}" ]; then
  echo "Erro: O diretório de build './${BUILD_DIR}' não foi encontrado após 'npm run build'."
  exit 1
fi

echo "Build concluído."

# --- 2. Compactar os arquivos (dist e server.js) --- 
echo "Compactando arquivos para deploy..."
tar -czvf "${ARCHIVE_NAME}" "${BUILD_DIR}" server.js package.json
echo "Compactação concluída: ${ARCHIVE_NAME}"

# --- 3. Copiar o arquivo compactado para a VPS --- 
echo "Copiando '${ARCHIVE_NAME}' para ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/..."
scp "${ARCHIVE_NAME}" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"
echo "Cópia para a VPS concluída."

# --- 4. Conectar à VPS e realizar o deploy --- 
echo "Conectando à VPS para descompactar e reiniciar a aplicação..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" << EOF
  set -e
  echo "Acessando diretório remoto: ${REMOTE_PATH}"
  cd "${REMOTE_PATH}"

  echo "Removendo conteúdo antigo do diretório de deploy..."
  # Criar o diretório 'dist' se não existir, e limpar seu conteúdo
  mkdir -p "${BUILD_DIR}"
  rm -rf "${BUILD_DIR}"/*

  echo "Descompactando ${ARCHIVE_NAME}..."
  tar -xzvf "${ARCHIVE_NAME}"

  echo "Removendo arquivo compactado remoto: ${ARCHIVE_NAME}"
  rm "${ARCHIVE_NAME}"

  echo "Reiniciando a aplicação PM2: ${APP_NAME}"
  pm2 restart "${APP_NAME}"
  echo "Deploy concluído na VPS."
EOF

echo "Deploy completo!"

# --- 5. Limpar arquivo compactado local --- 
echo "Removendo arquivo compactado local: ${ARCHIVE_NAME}"
rm "${ARCHIVE_NAME}"
echo "Limpeza local concluída."
