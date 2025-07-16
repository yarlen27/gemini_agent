#!/bin/bash

# Script para configurar SSL en el servidor

echo "🔐 Configurando SSL para Gemini Agent API..."

# Crear directorio para certificados
echo "📁 Creando directorio ssl..."
mkdir -p ssl

echo ""
echo "📋 Instrucciones:"
echo "1. Copia los archivos del certificado descargado a la carpeta 'ssl/':"
echo "   - certificate.crt"
echo "   - private.key"
echo "   - ca_bundle.crt"
echo ""
echo "2. En tu servidor, ejecuta:"
echo "   scp ssl/* usuario@tuservidor:/ruta/al/proyecto/ssl/"
echo ""
echo "3. En el servidor, ejecuta:"
echo "   docker-compose -f docker-compose.ssl.yml up -d --build"
echo ""
echo "4. Actualiza el workflow para usar:"
echo "   https://gemini.27cobalto.com"
echo ""

# Crear archivo de ejemplo para recordar
cat > ssl/README.md << EOF
# Certificados SSL

Coloca aquí los archivos:
- certificate.crt
- private.key  
- ca_bundle.crt

NO subas estos archivos a Git!
EOF

echo "✅ Configuración preparada!"