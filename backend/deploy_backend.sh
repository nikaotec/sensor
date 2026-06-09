#!/bin/bash

# --- Configurações --- 
REMOTE_USER="root"
REMOTE_HOST="109.123.240.215"
REMOTE_PATH="/root/sensor/backend" # Caminho absoluto na VPS (evitando o problema do ~ com aspas)
APP_NAME="smartrf-backend"
ARCHIVE_NAME="${APP_NAME}.tar.gz"

# Função para finalizar com pausa
finalizar_com_erro() {
  echo "------------------------------------------------"
  echo "ERRO CRÍTICO DURANTE O PROCESSO DE DEPLOY!"
  echo "Verifique as mensagens acima para detalhes."
  echo "------------------------------------------------"
  echo "Pressione ENTER para fechar..."
  read
  exit 1
}

# --- 1. Compactar os arquivos locais (src/ e pom.xml) --- 
echo "Compactando arquivos do código-fonte..."
# Evitamos compactar a pasta 'target/' (arquivos pesados de compilação) e o '.env' local
tar -czvf "${ARCHIVE_NAME}" src pom.xml || finalizar_com_erro
echo "Compactação concluída: ${ARCHIVE_NAME}"

# --- 2. Copiar o arquivo compactado para a VPS --- 
echo "Copiando '${ARCHIVE_NAME}' para a VPS (${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/)..."
echo "Nota: Se pedir senha, use: z?Uge982SsUvpeia"
scp "${ARCHIVE_NAME}" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"
if [ $? -ne 0 ]; then
  echo "ERRO AO COPIAR ARQUIVOS PARA A VPS. Verifique sua conexão e senha."
  finalizar_com_erro
fi
echo "Cópia concluída."

# --- 3. Conectar à VPS, descompactar na pasta do volume e reiniciar o Docker --- 
echo "Conectando à VPS para atualizar o código e reiniciar o container..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" << EOF
  # Grava logs do deploy na VPS
  exec > >(tee -a deploy_backend.log) 2>&1
  set -x
  
  echo "Acessando pasta do projeto na VPS..."
  cd "${REMOTE_PATH}" || { echo "Erro ao acessar pasta ${REMOTE_PATH}"; exit 1; }

  # A pasta 'backend' é a que está montada no volume do Docker (./backend:/app)
  echo "Garantindo que a pasta backend existe..."
  mkdir -p backend

  echo "Extraindo os arquivos na pasta backend..."
  tar -xzvf "${ARCHIVE_NAME}" -C backend/ || { echo "Erro ao descompactar"; exit 1; }

  echo "Limpando arquivo temporário..."
  rm "${ARCHIVE_NAME}"

  echo "Reiniciando o container docker do Spring Boot..."
  # Reinicia o container para o Maven recompilar o novo código
  docker compose restart smartrf-backend

  echo "Acompanhando inicialização (5 segundos)..."
  sleep 5
  docker ps | grep smartrf_backend_dev
  
  echo "Deploy finalizado com sucesso na VPS em: \$(date)"
EOF

if [ $? -eq 0 ]; then
  echo "------------------------------------------------"
  echo "DEPLOY DO BACKEND REALIZADO COM SUCESSO!"
  echo "------------------------------------------------"
else
  echo "------------------------------------------------"
  echo "ERRO DETECTADO DURANTE O DEPLOY NA VPS!"
  echo "------------------------------------------------"
fi

# --- 4. Limpar arquivo compactado local --- 
echo "Removendo arquivo compactado local: ${ARCHIVE_NAME}"
rm -f "${ARCHIVE_NAME}"

echo ""
echo "Pressione ENTER para fechar este terminal..."
read
