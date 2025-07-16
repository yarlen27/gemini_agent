#!/bin/bash

# Script de despliegue para Digital Ocean con ZeroSSL

echo "🚀 Iniciando despliegue de Gemini Agent API..."

# Verificar que se proporcione la API key
if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar la GEMINI_API_KEY"
    echo "Uso: ./deploy.sh <GEMINI_API_KEY>"
    exit 1
fi

# Variables
GEMINI_API_KEY=$1
DOMAIN="gemini.27cobalto.com"

echo "📦 Creando archivo .env.production..."
cat > .env.production << EOF
GEMINI_API_KEY=$GEMINI_API_KEY
EOF

echo "🔨 Deteniendo contenedores existentes..."
docker-compose -f docker-compose.production.yml down

echo "🏗️ Construyendo y levantando servicios..."
docker-compose -f docker-compose.production.yml up -d --build

echo "✅ Despliegue completado!"
echo ""
echo "📌 La API está disponible en:"
echo "   - HTTP: http://$DOMAIN:9099"
echo "   - Para HTTPS con ZeroSSL:"
echo "     1. Ve a https://zerossl.com"
echo "     2. Crea un certificado gratuito para $DOMAIN"
echo "     3. Usa la verificación DNS o HTTP"
echo "     4. Descarga el certificado"
echo ""
echo "🔧 Comandos útiles:"
echo "   - Ver logs: docker-compose -f docker-compose.production.yml logs -f"
echo "   - Detener: docker-compose -f docker-compose.production.yml down"
echo "   - Reiniciar: docker-compose -f docker-compose.production.yml restart"