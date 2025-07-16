#!/bin/bash

# Script de despliegue automático usando GitHub Secrets

echo "🚀 Iniciando despliegue automático con GitHub Secrets..."

# Obtener secrets de GitHub
echo "🔑 Obteniendo claves desde GitHub Secrets..."
GEMINI_API_KEY=$(gh secret get GEMINI_API_KEY)
GITHUB_TOKEN=$(gh secret get PROD_GITHUB_TOKEN)

if [ -z "$GEMINI_API_KEY" ] || [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: No se pudieron obtener las claves desde GitHub Secrets"
    exit 1
fi

echo "✅ Claves obtenidas exitosamente"

# Conectar al servidor y ejecutar despliegue
echo "🌐 Conectando al servidor de producción..."
ssh root@178.128.133.94 << EOF
    echo "📦 Navegando al directorio del proyecto..."
    cd /opt/gemini_agent_new || { echo "❌ Error: Directorio no encontrado"; exit 1; }
    
    echo "🔄 Actualizando código..."
    git pull origin main
    
    echo "📝 Configurando variables de entorno..."
    cd server
    
    # Crear archivo temporal con las variables reemplazadas
    sed "s/\${GEMINI_API_KEY}/GEMINI_API_KEY=$GEMINI_API_KEY/g" docker-compose.production.yml > temp_compose.yml
    sed -i "s/\${PROD_GITHUB_TOKEN}/GITHUB_TOKEN=$GITHUB_TOKEN/g" temp_compose.yml
    mv temp_compose.yml docker-compose.production.yml
    
    echo "🛑 Deteniendo contenedores existentes..."
    docker compose -f docker-compose.production.yml down
    
    echo "🏗️ Construyendo y desplegando..."
    docker compose -f docker-compose.production.yml up --build -d
    
    echo "⏳ Esperando que los servicios inicien..."
    sleep 15
    
    echo "🔍 Verificando estado de los servicios..."
    docker compose -f docker-compose.production.yml ps
    
    echo "🌐 Verificando health endpoint..."
    curl -f https://gemini.27cobalto.com/health || echo "⚠️ Health check falló"
    
    echo "✅ Despliegue completado!"
EOF

echo "🎉 Proceso de despliegue finalizado"