#!/bin/bash

# Script de despliegue automático para producción

echo "🚀 Iniciando despliegue en producción..."

# Conectar al servidor y ejecutar despliegue
echo "🌐 Conectando al servidor de producción..."
ssh root@178.128.133.94 << 'EOF'
    echo "📦 Navegando al directorio del proyecto..."
    cd /opt/gemini_agent_new || { 
        echo "📁 Directorio no existe, creando y clonando..."
        mkdir -p /opt/gemini_agent_new
        cd /opt/gemini_agent_new
        git clone https://github.com/yarlen27/gemini_agent.git .
    }
    
    echo "🔄 Actualizando código..."
    git pull origin main
    
    echo "📝 Configurando variables de entorno..."
    cd server-ts
    
    # Obtener secrets desde GitHub CLI y reemplazar variables
    GEMINI_KEY=$(gh secret get GEMINI_API_KEY)
    GITHUB_KEY=$(gh secret get PROD_GITHUB_TOKEN)
    sed -i "s/\${GEMINI_API_KEY}/GEMINI_API_KEY=$GEMINI_KEY/g" docker-compose.production.yml
    sed -i "s/\${GITHUB_TOKEN}/GITHUB_TOKEN=$GITHUB_KEY/g" docker-compose.production.yml
    
    echo "🛑 Deteniendo contenedores existentes..."
    docker compose -f docker-compose.production.yml down 2>/dev/null || true
    
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