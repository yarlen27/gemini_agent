#!/bin/bash

echo "🚀 Despliegue con Let's Encrypt automático"
echo ""
echo "⚠️  IMPORTANTE: Cambia DEFAULT_EMAIL en docker-compose.production.yml"
echo ""

# Verificar GEMINI_API_KEY
if [ -z "$1" ]; then
    echo "❌ Error: Proporciona GEMINI_API_KEY"
    echo "Uso: ./deploy-simple.sh <GEMINI_API_KEY>"
    exit 1
fi

# Crear .env
echo "GEMINI_API_KEY=$1" > .env.production

echo "📋 Pasos en tu servidor:"
echo ""
echo "1. Asegúrate que el dominio gemini.27cobalto.com apunta a tu servidor"
echo ""
echo "2. En el servidor ejecuta:"
echo "   git pull"
echo "   docker-compose -f docker-compose.production.yml up -d"
echo ""
echo "3. Let's Encrypt obtendrá el certificado automáticamente"
echo ""
echo "4. La API estará en https://gemini.27cobalto.com"
echo ""
echo "⏱️  El certificado puede tardar 2-3 minutos en generarse"