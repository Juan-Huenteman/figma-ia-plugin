# Figma AI Plugin - Generador de UI con IA

Plugin de Figma que utiliza inteligencia artificial (Gemini) para generar interfaces de usuario modernas y responsivas.

## 🏗️ Arquitectura

El proyecto utiliza una **arquitectura modular** siguiendo principios de Clean Code y SOLID:

```
figma-mcp-plugin/
├── code.ts                 # Punto de entrada principal
├── src/                    # Código fuente modular
│   ├── types.ts           # Interfaces y tipos TypeScript
│   ├── config.ts          # Configuraciones y constantes
│   ├── gemini-service.ts  # Servicio API de Gemini
│   ├── node-factory.ts    # Factory para crear nodos de Figma
│   ├── frame-manager.ts   # Gestión de frames y contenido
│   ├── ui-manager.ts      # Comunicación con interfaz de usuario
│   ├── error-handler.ts   # Manejo centralizado de errores
│   └── validation.ts      # Validación de datos
├── dist/                   # Código compilado (generado)
├── ui.html                # Interfaz de usuario del plugin
├── manifest.json          # Configuración del plugin
└── tsconfig.json          # Configuración de TypeScript
```

## 🚀 Comandos de Desarrollo

### Instalación
```bash
npm install
```

### Desarrollo
```bash
# Compilar y watch automático (recomendado para desarrollo)
npm run dev

# Solo watch (sin limpiar dist)
npm run watch
```

### Producción
```bash
# Compilar para producción (limpia y construye)
npm run prod

# Solo compilar
npm run build

# Limpiar archivos compilados
npm run clean

# Para sistemas Unix/Linux/Mac (alternativo)
npm run clean:unix
```

## 📦 Estructura de Compilación

- **Código fuente**: `src/` y `code.ts`
- **Código compilado**: `dist/`
- **Punto de entrada**: `dist/code.js` (definido en `manifest.json`)

## 🔧 Tecnologías

- **TypeScript**: Lenguaje principal
- **Figma Plugin API**: Integración con Figma
- **Google Gemini API**: Generación de UI con IA
- **HTML/CSS/JS**: Interfaz de usuario

## 📋 Características

- ✅ **Generación de UI responsiva** para Mobile, Tablet y Desktop
- ✅ **Integración con Gemini AI** para prompts inteligentes
- ✅ **Gestión de frames existentes** y creación de nuevos
- ✅ **Validación robusta** de datos de entrada
- ✅ **Manejo de errores** centralizado y amigable
- ✅ **Arquitectura modular** para fácil mantenimiento

## 🛠️ Desarrollo

### Estructura Modular

Cada módulo tiene una responsabilidad específica:

- **types.ts**: Definiciones de tipos e interfaces
- **config.ts**: Configuraciones de dispositivos y constantes
- **gemini-service.ts**: Comunicación con API de Gemini
- **node-factory.ts**: Creación de nodos de Figma
- **frame-manager.ts**: Gestión de frames y contenido
- **ui-manager.ts**: Comunicación bidireccional con UI
- **error-handler.ts**: Manejo centralizado de errores
- **validation.ts**: Validación de datos y estructuras

### Flujo de Compilación

1. **Desarrollo**: `npm run dev` → Compila a `dist/` y observa cambios
2. **Figma**: Lee `dist/code.js` según `manifest.json`
3. **Producción**: `npm run prod` → Compilación optimizada

## 📝 Notas

- Los archivos `.js` generados se excluyen del control de versiones
- La carpeta `dist/` se regenera en cada compilación
- TypeScript se configura con source maps para debugging 