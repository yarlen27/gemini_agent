# AGENT GUIDELINES

Directivas estándar para agentes de IA trabajando en el proyecto Gemini Agent.

## 📋 Procedimiento Estándar para Implementación de Tools

### 🔄 **Workflow Obligatorio**

1. **Análisis Previo**
   - Leer arquitectura existente en `/server-ts/src/tools/`
   - Revisar `ITool` interface y `ToolRegistry`
   - Verificar que no exista tool similar

2. **Implementación TDD**
   - Crear tests PRIMERO (`/tests/tools/NombreTool.test.ts`)
   - Implementar tool para pasar tests
   - Verificar cobertura >90%

3. **Integración**
   - Registrar en `ToolRegistry`
   - Actualizar documentación en `CLAUDE.md`
   - Crear PR con template específico

4. **Validación**
   - Tests unitarios pasan
   - Tests de integración pasan
   - Health endpoint muestra nuevo tool

---

## 🎨 Estilo de Codificación Estándar

### **Estructura de Archivos**
```
server-ts/src/tools/implementations/
├── categories/
│   ├── dotnet/
│   │   ├── DotNetCliTool.ts
│   │   ├── EntityFrameworkTool.ts
│   │   └── AspNetCoreTool.ts
│   ├── database/
│   └── testing/
```

### **Template de Tool (OBLIGATORIO)**
```typescript
import { ITool, ToolResult, ToolContext } from '../ITool';

export class NombreTool implements ITool {
    readonly name = 'nombre_snake_case';
    readonly description = 'Descripción clara y específica';
    
    readonly schema = {
        type: 'object',
        properties: {
            // Parámetros específicos
        },
        required: ['param1'],
        additionalProperties: false
    };

    async execute(params: any, context: ToolContext): Promise<ToolResult> {
        try {
            // Validación de parámetros
            // Lógica principal
            // Logging estructurado
            return { success: true, data: result };
        } catch (error) {
            return { 
                success: false, 
                error: `Error en ${this.name}: ${error.message}` 
            };
        }
    }
}
```

### **Convenciones de Naming**
- **Files**: PascalCase (`DotNetCliTool.ts`)
- **Classes**: PascalCase (`DotNetCliTool`)  
- **Tool names**: snake_case (`dotnet_new_project`)
- **Methods**: camelCase (`executeCommand`)
- **Variables**: camelCase (`projectName`)

### **Manejo de Errores (OBLIGATORIO)**
```typescript
try {
    // Operación
} catch (error) {
    context.logger?.error(`${this.name} failed`, { 
        error: error.message,
        params,
        timestamp: new Date().toISOString()
    });
    return { success: false, error: `${this.name}: ${error.message}` };
}
```

### **Tests Obligatorios**
```typescript
describe('NombreTool', () => {
    it('should execute successfully with valid params');
    it('should handle invalid parameters gracefully');
    it('should log errors appropriately');
    it('should work with tool context');
});
```

---

## 📝 PR Template (OBLIGATORIO)

```markdown
## Tool Implementation: [nombre_tool]

### ✅ Checklist
- [ ] Tests unitarios creados y pasando (>90% coverage)
- [ ] Tool registrado en ToolRegistry
- [ ] Documentación actualizada en CLAUDE.md
- [ ] Manejo de errores implementado
- [ ] Logging estructurado incluido
- [ ] Schema de validación definido

### 🧪 Testing
- Comando para tests: `npm test -- NombreTool`
- Coverage: X%

### 📝 Usage Example
```typescript
const tool = new NombreTool();
const result = await tool.execute({ param1: 'value' }, context);
```

### 🔧 Integration
- Tool registrado en: `server-ts/src/Program.ts`
- Categoría: [dotnet/database/testing/etc]
```

---

## 🚨 Reglas Críticas

### **NO Hacer**
- ❌ NO modificar archivos fuera del scope del issue
- ❌ NO crear tools duplicados
- ❌ NO hacer commits directos a main
- ❌ NO saltarse tests unitarios
- ❌ NO usar hardcoded values

### **SÍ Hacer**
- ✅ Seguir TDD estrictamente
- ✅ Validar todos los parámetros
- ✅ Implementar logging estructurado
- ✅ Crear PRs con descripción completa
- ✅ Verificar que tests existentes siguen pasando

---

## 🔍 Proceso de Code Review

### **Auto-verificación antes de PR**
1. `npm test` - Todos los tests pasan
2. `npm run build` - Compilación exitosa
3. Verificar health endpoint incluye nuevo tool
4. Verificar que no hay imports rotos

### **Criterios de Aprobación**
- Tests con >90% coverage
- Documentación actualizada
- Manejo de errores completo
- Naming conventions seguidas
- No breaking changes

---

## 📚 Referencias Técnicas

### **Arquitectura Base**
- `ITool` interface: Define contrato de todos los tools
- `ToolRegistry`: Sistema de registro plugin-based
- `ToolContext`: Contexto de ejecución con logger y working directory

### **Ejemplos de Referencia**
- `ShellTool.ts`: Ejecución de comandos shell
- `ReadFileTool.ts`: Lectura de archivos con validación
- `WriteFileTool.ts`: Escritura de archivos con auto-creación de directorios

### **Patrones Establecidos**
- Result Pattern para operaciones que pueden fallar
- Dependency Injection para servicios
- Plugin Architecture para extensibilidad
- Structured Logging para debugging

---

*Versión: 1.0 | Última actualización: 2025-07-16*