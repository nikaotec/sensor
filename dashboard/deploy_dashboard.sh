#!/bin/bash

# --- Configurações --- 
REMOTE_USER="root"
REMOTE_HOST="109.123.240.215"
REMOTE_PATH="/var/www/nikaotech"
APP_NAME="nikaotech"
BUILD_DIR="dist"
ARCHIVE_NAME="${APP_NAME}.tar.gz"

# Função para finalizar com pausa
finalizar_com_erro() {
  echo "------------------------------------------------"
  echo "ERRO CRÍTICO DURANTE O PROCESSO!"
  echo "Verifique as mensagens acima para detalhes."
  echo "------------------------------------------------"
  echo "Pressione ENTER para fechar..."
  read
  exit 1
}

# --- 1. Build da aplicação --- 
echo "Iniciando o build da aplicação..."
npm run build || finalizar_com_erro

# Verificar se o diretório de build foi criado
if [ ! -d "./${BUILD_DIR}" ]; then
  echo "Erro: O diretório de build './${BUILD_DIR}' não foi encontrado após 'npm run build'."
  finalizar_com_erro
fi

echo "Build concluído."

# --- 2. Compactar os arquivos (dist, server.js e package.json) --- 
echo "Compactando arquivos para deploy..."
# REMOVIDO o .env do tar para evitar que seu arquivo local sobrescreva o da VPS que corrigimos.
tar -czvf "${ARCHIVE_NAME}" "${BUILD_DIR}" server.js package.json || finalizar_com_erro
echo "Compactação concluída: ${ARCHIVE_NAME}"

# --- 3. Copiar o arquivo compactado para a VPS --- 
echo "Copiando '${ARCHIVE_NAME}' para ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/..."
echo "Nota: Se pedir senha, use: z?Uge982SsUvpeia"
scp "${ARCHIVE_NAME}" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"
if [ $? -ne 0 ]; then
  echo "ERRO AO COPIAR ARQUIVOS PARA A VPS. Verifique sua conexão e senha."
  finalizar_com_erro
fi
echo "Cópia para a VPS concluída."

# --- 4. Conectar à VPS e realizar o deploy --- 
echo "Conectando à VPS para descompactar e reiniciar a aplicação..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" << EOF
  # Redirecionar tudo para um arquivo de log na VPS também
  exec > >(tee -a deploy.log) 2>&1
  set -x # Mostrar comandos sendo executados
  
  echo "Acessando diretório remoto: ${REMOTE_PATH}"
  cd "${REMOTE_PATH}" || { echo "Erro ao acessar pasta"; exit 1; }

  echo "Removendo conteúdo antigo do diretório de deploy..."
  mkdir -p "${BUILD_DIR}"
  rm -rf "${BUILD_DIR}"/*

  echo "Descompactando ${ARCHIVE_NAME}..."
  tar -xzvf "${ARCHIVE_NAME}" || { echo "Erro ao descompactar"; exit 1; }

  echo "Removendo arquivo compactado remoto: ${ARCHIVE_NAME}"
  rm "${ARCHIVE_NAME}"

  echo "Instalando dependências..."
  # Remove node_modules antigo para evitar conflitos de cache
  rm -rf node_modules
  npm install --omit=dev || { echo "Erro no npm install"; exit 1; }
  
  echo "Reiniciando a aplicação PM2 com segurança..."
  # Deleta o processo antigo se ele existir para limpar caches de diretório do PM2
  pm2 delete "${APP_NAME}" 2>/dev/null || true
  
  # Inicializa o processo forçando explicitamente a pasta de trabalho correta (--cwd)
  pm2 start server.js --name "${APP_NAME}" --cwd "${REMOTE_PATH}"
  
  # Salva o estado atual do PM2 para persistir no reboot da VPS
  pm2 save
  
  echo "Deploy concluído na VPS em: \$(date)"
EOF

if [ $? -eq 0 ]; then
  echo "------------------------------------------------"
  echo "DEPLOY COMPLETO COM SUCESSO!"
  echo "------------------------------------------------"
else
  echo "------------------------------------------------"
  echo "ERRO DETECTADO DURANTE O DEPLOY NA VPS!"
  echo "------------------------------------------------"
fi

# --- 5. Limpar arquivo compactado local --- 
echo "Removendo arquivo compactado local: ${ARCHIVE_NAME}"
rm -f "${ARCHIVE_NAME}"

echo ""
echo "Pressione ENTER para fechar este terminal..."
read