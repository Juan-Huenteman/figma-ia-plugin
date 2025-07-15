// Figma plugin entrypoint – TypeScript
// Muestra UI opcional, o bien espera mensajes desde Cursor/Claude vía MCP.

// Mostrar UI mejorada
figma.showUI(__html__, { width: 420, height: 900 });

figma.on("run", () => {
  // cierra la UI inmediata si querés modo headless
  // figma.ui.close();
});

interface MCPFrameNode {
  name: string;
  nodes: MCPNode[];
}
interface MCPNode {
  type: "TEXT" | "RECTANGLE" | "FRAME" | "IMAGE";
  text?: string;
  characters?: string; // Gemini usa 'characters' en lugar de 'text'
  width?: number;
  height?: number;
  x: number;
  y: number;
  fills?: {
    type: "SOLID";
    color: { r: number; g: number; b: number; a?: number };
  }[];
  cornerRadius?: number;
  effects?: Array<{
    type: "DROP_SHADOW";
    color: { r: number; g: number; b: number; a: number };
    offset: { x: number; y: number };
    radius: number;
    spread?: number;
  }>;
  strokes?: {
    type: "SOLID";
    color: { r: number; g: number; b: number; a?: number };
  }[];
  strokeWeight?: number;
  fontSize?: number;
  fontWeight?: "normal" | "bold" | "medium" | "light";
  textAlign?: "LEFT" | "CENTER" | "RIGHT" | "left" | "center" | "right";
  imageUrl?: string;
  opacity?: number;
  // Auto-layout properties
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  primaryAxisSizingMode?: "FIXED" | "AUTO";
  counterAxisSizingMode?: "FIXED" | "AUTO";
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX";
  // Padding para elementos individuales
  padding?: number;
  // Children para elementos FRAME (puede ser 'children' o 'nodes')
  children?: MCPNode[];
  nodes?: MCPNode[];
}

async function callGemini(
  prompt: string,
  apiKey: string,
  model: string = "gemini-1.5-flash",
  deviceType: string = "mobile"
) {
  const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Configurar dimensiones según dispositivo PRIMERO
  const deviceConfig = {
    mobile: { width: 375, height: 812, margin: 20 },
    tablet: { width: 768, height: 1024, margin: 40 },
    desktop: { width: 1200, height: 800, margin: 60 },
  };

  const config =
    deviceConfig[deviceType as keyof typeof deviceConfig] ||
    deviceConfig.mobile;

  const systemPrompt = `Eres un EXPERTO UX/UI Designer. Crea interfaces modernas, profesionales y optimizadas para ${deviceType.toUpperCase()}.

DIMENSIONES OBLIGATORIAS PARA ${deviceType.toUpperCase()}:
- Canvas: ${config.width}x${config.height}px
- Margen mínimo: ${config.margin}px
- El frame principal DEBE usar exactamente estas dimensiones: ${config.width}x${
    config.height
  }

RESPONDE SOLO con JSON válido siguiendo EXACTAMENTE esta estructura:
{
  "frames": [
    {
      "name": "ScreenName",
      "nodes": [
        {
          "type": "FRAME",
          "x": 0,
          "y": 0,
          "width": ${config.width},
          "height": ${config.height},
          "fills": [{"type": "SOLID", "color": {"r": 0.98, "g": 0.98, "b": 0.98}}],
          "layoutMode": "VERTICAL",
          "paddingTop": ${Math.round(config.height * 0.15)},
          "paddingBottom": ${config.margin * 2},
          "paddingLeft": ${config.margin},
          "paddingRight": ${config.margin},
          "itemSpacing": ${Math.round(config.margin * 0.8)},
          "primaryAxisSizingMode": "AUTO",
          "counterAxisSizingMode": "FIXED",
          "primaryAxisAlignItems": "CENTER",
          "counterAxisAlignItems": "CENTER",
          "children": [
            {"type": "TEXT", "characters": "Título", "fontSize": 32, "textAlign": "CENTER"},
            {"type": "TEXT", "characters": "Subtítulo", "fontSize": 16, "textAlign": "CENTER"}
          ]
        }
      ]
    }
  ]
}

⚠️ ESTRUCTURA CRÍTICA:
- TODOS los elementos UI deben ir en "children" del FRAME principal
- NUNCA pongas elementos como hermanos del FRAME principal
- El FRAME principal es el contenedor, todo lo demás va dentro

REGLAS ESPECÍFICAS PARA ${deviceType.toUpperCase()}:
${
  deviceType === "mobile"
    ? `
- Botones: altura 48-56px, ancho máximo ${config.width - config.margin * 2}px
- Títulos: fontSize 24-32px
- Texto: fontSize 16px
- Textos pequeños: fontSize 14px
- Input fields: altura 48px mínimo
`
    : deviceType === "tablet"
    ? `
- Botones: altura 52-60px, ancho máximo ${config.width - config.margin * 2}px  
- Títulos: fontSize 32-40px
- Texto: fontSize 18px
- Textos pequeños: fontSize 16px
- Input fields: altura 52px mínimo
- Más espaciado entre elementos
`
    : `
- Botones: altura 56-64px, ancho máximo 400px (no todo el ancho)
- Títulos: fontSize 36-48px
- Texto: fontSize 18px
- Textos pequeños: fontSize 16px
- Input fields: altura 56px mínimo
- Layout más espacioso y centrado
- Contenido principal máximo 600px de ancho para mejor UX
`
}

PROPIEDADES DISPONIBLES:
- type: "TEXT", "RECTANGLE", "FRAME", "IMAGE"
- x, y, width, height: posición y tamaño (x,y DENTRO del frame principal)
- fills: colores de fondo SOLO SOLID [{"type": "SOLID", "color": {"r": 0.2, "g": 0.6, "b": 1}}] (NO uses type: IMAGE)
- cornerRadius: bordes redondeados
- effects: sombras [{"type": "DROP_SHADOW", "color": {...}, "offset": {"x": 0, "y": 2}, "radius": 8}]
- strokes: bordes [{"type": "SOLID", "color": {...}}]
- strokeWeight: grosor del borde
- opacity: transparencia (0-1)

AUTO-LAYOUT (solo para FRAME):
- layoutMode: "VERTICAL", "HORIZONTAL", "NONE"
- paddingTop, paddingBottom, paddingLeft, paddingRight
- itemSpacing: espacio entre hijos
- primaryAxisSizingMode: "FIXED", "AUTO"
- counterAxisSizingMode: "FIXED", "AUTO"
- primaryAxisAlignItems: "MIN", "CENTER", "MAX", "SPACE_BETWEEN"
- counterAxisAlignItems: "MIN", "CENTER", "MAX"

TEXTO:
- characters: contenido del texto (OBLIGATORIO para TEXT)
- fontSize, fontWeight, textAlign
- textAlign: "LEFT", "CENTER", "RIGHT" (MAYÚSCULAS OBLIGATORIO)
- fills: OBLIGATORIO para TEXT [{"type": "SOLID", "color": {"r": 0.1, "g": 0.1, "b": 0.1}}]
- Ejemplo: {"type": "TEXT", "characters": "Mi texto", "fontSize": 16, "fills": [{"type": "SOLID", "color": {"r": 0.1, "g": 0.1, "b": 0.1}}]}

BOTONES (IMPORTANTE):
- USA FRAME con TEXT dentro, NO RECTANGLE + TEXT separados
- El texto va en children del FRAME, con center alignment
- Ejemplo correcto: {"type": "FRAME", "width": 200, "height": 48, "fills": [...], "layoutMode": "VERTICAL", "primaryAxisAlignItems": "CENTER", "counterAxisAlignItems": "CENTER", "children": [{"type": "TEXT", "characters": "Mi Botón", "fills": [...]}]}

COLORES PROFESIONALES (valores 0-1):
- Texto primario: {"r": 0.1, "g": 0.1, "b": 0.1}
- Texto secundario: {"r": 0.4, "g": 0.4, "b": 0.4}
- Texto en botones oscuros: {"r": 1, "g": 1, "b": 1} ¡OBLIGATORIO!
- Fondo claro: {"r": 0.98, "g": 0.98, "b": 0.98}
- Botón primario: {"r": 0.2, "g": 0.6, "b": 1}
- Botón éxito: {"r": 0.2, "g": 0.8, "b": 0.4}

REGLAS CRÍTICAS OBLIGATORIAS:
❌ NUNCA uses la propiedad "a" en colores
❌ NUNCA pongas elementos con x,y fuera del frame principal
❌ NUNCA uses textAlign en minúsculas
❌ NUNCA pongas elementos UI como hermanos del FRAME principal
❌ NUNCA uses "nodes" para elementos hijos, usa "children"
✅ SIEMPRE usa las dimensiones exactas del dispositivo: ${config.width}x${
    config.height
  }
✅ SIEMPRE adapta tamaños según el dispositivo
✅ SIEMPRE centra el contenido apropiadamente para ${deviceType.toUpperCase()}
✅ SIEMPRE pon todos los elementos UI dentro de "children" del FRAME principal
✅ SIEMPRE usa "characters" para el texto (no "text")

CENTRADO Y LAYOUTS:
- Para centrar: counterAxisAlignItems: "CENTER"
- Para formularios: usa paddingTop grande para centrar verticalmente
- Para desktop: limita el ancho del contenido para mejor UX
- Para texto en botón: mismas coordenadas x,y que el botón

USA AUTO-LAYOUT SIEMPRE que sea posible para layouts responsivos.`;

  const loginSpecificPrompt = `
ESTRUCTURA ESPECÍFICA PARA LOGIN MOBILE:
{
  "type": "FRAME",
  "width": 375,
  "height": 812,
  "layoutMode": "VERTICAL",
  "paddingTop": 122,
  "paddingBottom": 40,
  "paddingLeft": 20,
  "paddingRight": 20,
  "itemSpacing": 24,
  "children": [
    {"type": "TEXT", "characters": "Iniciar Sesión", "fontSize": 32, "fontWeight": "BOLD", "textAlign": "CENTER"},
    {"type": "TEXT", "characters": "Bienvenido de nuevo", "fontSize": 16, "textAlign": "CENTER"},
    {
      "type": "FRAME",
      "name": "EmailField",
      "width": 335,
      "height": 72,
      "layoutMode": "VERTICAL",
      "itemSpacing": 8,
      "children": [
        {"type": "TEXT", "characters": "Email", "fontSize": 14},
        {
          "type": "RECTANGLE",
          "width": 335,
          "height": 48,
          "cornerRadius": 8,
          "fills": [{"type": "SOLID", "color": {"r": 1, "g": 1, "b": 1}}],
          "strokes": [{"type": "SOLID", "color": {"r": 0.8, "g": 0.8, "b": 0.8}}],
          "strokeWeight": 1
        }
      ]
    },
    {
      "type": "FRAME", 
      "name": "PasswordField",
      "width": 335,
      "height": 72,
      "layoutMode": "VERTICAL",
      "itemSpacing": 8,
      "children": [
        {"type": "TEXT", "characters": "Contraseña", "fontSize": 14},
        {
          "type": "RECTANGLE",
          "width": 335,
          "height": 48,
          "cornerRadius": 8,
          "fills": [{"type": "SOLID", "color": {"r": 1, "g": 1, "b": 1}}],
          "strokes": [{"type": "SOLID", "color": {"r": 0.8, "g": 0.8, "b": 0.8}}],
          "strokeWeight": 1
        }
      ]
    },
    {"type": "TEXT", "characters": "¿Olvidaste tu contraseña?", "fontSize": 14, "textAlign": "RIGHT"},
    {
      "type": "FRAME",
      "name": "LoginButton", 
      "width": 335,
      "height": 48,
      "cornerRadius": 8,
      "fills": [{"type": "SOLID", "color": {"r": 0.2, "g": 0.6, "b": 1}}],
      "layoutMode": "VERTICAL",
      "primaryAxisAlignItems": "CENTER",
      "counterAxisAlignItems": "CENTER",
      "children": [
        {"type": "TEXT", "characters": "Iniciar Sesión", "fontSize": 16, "fontWeight": "MEDIUM", "textAlign": "CENTER", "fills": [{"type": "SOLID", "color": {"r": 1, "g": 1, "b": 1}}]}
      ]
    },
    {"type": "TEXT", "characters": "O inicia sesión con", "fontSize": 14, "textAlign": "CENTER"},
    {
      "type": "FRAME",
      "name": "SocialButtons",
      "width": 335,
      "height": 56,
      "layoutMode": "HORIZONTAL",
      "itemSpacing": 16,
      "primaryAxisAlignItems": "CENTER",
      "children": [
        {
          "type": "FRAME", 
          "name": "FacebookButton", 
          "width": 159, 
          "height": 56, 
          "cornerRadius": 8, 
          "fills": [{"type": "SOLID", "color": {"r": 0.2, "g": 0.4, "b": 0.7}}],
          "layoutMode": "VERTICAL",
          "primaryAxisAlignItems": "CENTER",
          "counterAxisAlignItems": "CENTER",
          "children": [
            {"type": "TEXT", "characters": "Facebook", "fontSize": 14, "fontWeight": "MEDIUM", "textAlign": "CENTER", "fills": [{"type": "SOLID", "color": {"r": 1, "g": 1, "b": 1}}]}
          ]
        },
        {
          "type": "FRAME", 
          "name": "GoogleButton", 
          "width": 159, 
          "height": 56, 
          "cornerRadius": 8, 
          "fills": [{"type": "SOLID", "color": {"r": 0.9, "g": 0.9, "b": 0.9}}],
          "layoutMode": "VERTICAL",
          "primaryAxisAlignItems": "CENTER",
          "counterAxisAlignItems": "CENTER",
          "children": [
            {"type": "TEXT", "characters": "Google", "fontSize": 14, "fontWeight": "MEDIUM", "textAlign": "CENTER", "fills": [{"type": "SOLID", "color": {"r": 0.1, "g": 0.1, "b": 0.1}}]}
          ]
        }
      ]
    },
    {"type": "TEXT", "characters": "¿No tienes cuenta? Regístrate", "fontSize": 16, "textAlign": "CENTER"}
  ]
}`;

  const devicePrompt = `
DISPOSITIVO SELECCIONADO: ${deviceType.toUpperCase()}
- Canvas: ${config.width}x${config.height}px
- Márgenes: ${config.margin}px mínimo
- Adapta tamaños de fuente y elementos según las reglas de ${deviceType.toUpperCase()}

IMPORTANTE: El primer nodo FRAME debe tener exactamente estas dimensiones:
"width": ${config.width}, "height": ${config.height}
`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: (() => {
              // Detectar si es un prompt de login para usar ejemplo específico
              const isLoginPrompt =
                prompt.toLowerCase().includes("login") ||
                prompt.toLowerCase().includes("sesión") ||
                prompt.toLowerCase().includes("password") ||
                prompt.toLowerCase().includes("contraseña");

              const loginExample =
                isLoginPrompt && deviceType === "mobile"
                  ? loginSpecificPrompt
                  : "";
              console.log(
                `Prompt tipo: ${
                  isLoginPrompt ? "Login específico" : "General"
                }, Dispositivo: ${deviceType}`
              );

              return (
                systemPrompt +
                devicePrompt +
                loginExample +
                "\n\nPrompt del usuario: " +
                prompt
              );
            })(),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 8192, // Aumentado para respuestas complejas
    },
  };

  // Lógica de reintento para manejar sobrecarga del servidor
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        const error = new Error(`Gemini API ${res.status}: ${errText}`);

        // Si es error 503 (sobrecarga), reintentar después de un delay
        if (res.status === 503 && attempt < 3) {
          lastError = error;
          figma.notify(`⏳ Reintentando... (${attempt}/3)`);
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt)); // Delay incremental
          continue;
        }

        throw error;
      }

      const data = await res.json();

      if (
        !data.candidates ||
        !data.candidates[0] ||
        !data.candidates[0].content
      ) {
        throw new Error("Respuesta inválida de Gemini API");
      }

      let responseText = data.candidates[0].content.parts[0].text;

      // Limpiar marcadores de código markdown si existen
      if (responseText.includes("```json")) {
        responseText = responseText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "");
      }

      // Remover espacios en blanco extra
      responseText = responseText.trim();

      try {
        // Validar que el JSON esté completo
        const openBraces = (responseText.match(/{/g) || []).length;
        const closeBraces = (responseText.match(/}/g) || []).length;
        const openBrackets = (responseText.match(/\[/g) || []).length;
        const closeBrackets = (responseText.match(/]/g) || []).length;

        if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
          throw new Error(
            `JSON truncado - llaves: ${openBraces}/${closeBraces}, corchetes: ${openBrackets}/${closeBrackets}. Aumenta el límite de tokens.`
          );
        }

        const parsedData = JSON.parse(responseText);

        // Validar estructura básica
        if (!parsedData.frames || !Array.isArray(parsedData.frames)) {
          throw new Error("El JSON no contiene un array 'frames' válido");
        }

        return parsedData;
      } catch (parseError) {
        // Mostrar una porción del JSON para debug
        const preview =
          responseText.length > 500
            ? responseText.substring(0, 500) + "...[TRUNCADO]"
            : responseText;

        throw new Error(
          `Error al parsear respuesta de Gemini (${
            parseError instanceof Error ? parseError.message : "parsing error"
          }): ${preview}`
        );
      }
    } catch (error) {
      lastError = error as Error;

      // Si es el último intento, lanzar el error
      if (attempt === 3) {
        throw lastError;
      }

      // Para otros errores (no 503), no reintentar
      if (!(error as Error).message.includes("503")) {
        throw error;
      }

      // Esperar antes del siguiente intento
      figma.notify(`⏳ Reintentando... (${attempt}/3)`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }

  // Fallback (no debería llegar aquí)
  throw lastError || new Error("Error desconocido en Gemini");
}

// Función para enviar alertas bonitas a la UI
function sendUIMessage(
  type: string,
  message: string,
  alertType: string = "error"
) {
  figma.ui.postMessage({ type, message, alertType });
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "getContext") {
    // Obtener frame seleccionado
    const selection = figma.currentPage.selection;
    let selectedFrame: {
      name: string;
      width: number;
      height: number;
      id: string;
      deviceType?: string;
      styleInfo?: {
        backgroundColor?: string;
        layoutMode?: string;
        padding?: string;
        spacing?: number;
        elementCount?: number;
        hasImages?: boolean;
        hasButtons?: boolean;
        hasInputs?: boolean;
        primaryColors?: string[];
        description?: string;
      };
    } | null = null;

    if (selection.length === 1 && selection[0].type === "FRAME") {
      const frame = selection[0] as FrameNode;

      // Analizar el contenido del frame
      const children = frame.children;
      let hasImages = false;
      let hasButtons = false;
      let hasInputs = false;
      let primaryColors: string[] = [];

      // Detectar tipo de dispositivo basado en dimensiones
      let deviceType = "mobile";
      if (frame.width >= 1200) deviceType = "desktop";
      else if (frame.width >= 768) deviceType = "tablet";

      // Analizar elementos hijos
      children.forEach((child) => {
        if ("fills" in child && child.fills && Array.isArray(child.fills)) {
          child.fills.forEach((fill) => {
            if (fill.type === "SOLID" && "color" in fill) {
              const color = fill.color;
              const colorStr = `rgb(${Math.round(color.r * 255)}, ${Math.round(
                color.g * 255
              )}, ${Math.round(color.b * 255)})`;
              if (
                primaryColors.indexOf(colorStr) === -1 &&
                primaryColors.length < 3
              ) {
                primaryColors.push(colorStr);
              }
            }
          });
        }

        // Detectar tipos de elementos
        if (
          child.type === "RECTANGLE" &&
          child.width > 200 &&
          child.height < 60
        ) {
          hasButtons = true;
        }
        if (
          child.type === "RECTANGLE" &&
          child.height > 40 &&
          child.height < 60
        ) {
          hasInputs = true;
        }
        if (
          child.name.toLowerCase().indexOf("image") !== -1 ||
          child.name.toLowerCase().indexOf("img") !== -1
        ) {
          hasImages = true;
        }
      });

      // Generar descripción automática
      let description = `Frame ${deviceType} (${frame.width}x${frame.height}) con ${children.length} elementos`;
      if (hasButtons) description += ", incluye botones";
      if (hasInputs) description += ", incluye campos de entrada";
      if (hasImages) description += ", incluye imágenes";

      selectedFrame = {
        name: frame.name,
        width: frame.width,
        height: frame.height,
        id: frame.id,
        deviceType: deviceType,
        styleInfo: {
          backgroundColor:
            frame.fills &&
            Array.isArray(frame.fills) &&
            frame.fills[0] &&
            "color" in frame.fills[0]
              ? `rgb(${Math.round(frame.fills[0].color.r * 255)}, ${Math.round(
                  frame.fills[0].color.g * 255
                )}, ${Math.round(frame.fills[0].color.b * 255)})`
              : "white",
          layoutMode: "layoutMode" in frame ? frame.layoutMode : "NONE",
          padding: "paddingTop" in frame ? `${frame.paddingTop || 0}px` : "0px",
          spacing: "itemSpacing" in frame ? frame.itemSpacing || 0 : 0,
          elementCount: children.length,
          hasImages,
          hasButtons,
          hasInputs,
          primaryColors,
          description,
        },
      };
    }

    figma.ui.postMessage({
      type: "contextUpdate",
      frame: selectedFrame,
    });
  } else if (msg.type === "generate") {
    try {
      const modelName = msg.model || "gemini-1.5-flash";
      const modelDisplay = modelName
        .replace("gemini-", "Gemini ")
        .replace("-", " ");

      figma.notify(`🤖 Generando con ${modelDisplay}...`);
      sendUIMessage(
        "success",
        `Generando diseño con ${modelDisplay}...`,
        "success"
      );

      // Crear prompt con contexto si hay frame seleccionado
      let contextualPrompt = msg.prompt;

      // Comportamiento por defecto: crear algo nuevo
      if (!msg.selectedFrame) {
        contextualPrompt = `MODO: Crear nuevo diseño desde cero

${msg.prompt}

INSTRUCCIONES: Crea un diseño completamente nuevo y moderno siguiendo las mejores prácticas de UX/UI.`;
      } else {
        // Modo edición: adaptar frame existente
        contextualPrompt = `CONTEXTO: Estoy editando un frame llamado "${msg.selectedFrame.name}" de ${msg.selectedFrame.width}x${msg.selectedFrame.height}px. 

PROMPT DEL USUARIO: ${msg.prompt}

Por favor, adapta el diseño al tamaño existente y mantén coherencia con el nombre del frame.`;
      }

      // Si es una adaptación, agregar instrucciones específicas
      if (msg.isAdaptation) {
        contextualPrompt += `

NOTA IMPORTANTE: Esta es una ADAPTACIÓN de un diseño existente a un nuevo dispositivo. Crea un frame con nombre similar pero indicando el dispositivo target (ej: "LoginScreen_Desktop", "LoginScreen_Tablet").`;
      }

      // Agregar información sobre reglas personalizadas si las hay
      if (msg.hasCustomRules) {
        contextualPrompt += `

NOTA: El usuario ha definido reglas personalizadas que ya están incluidas en el prompt anterior. Asegúrate de respetarlas.`;
      }

      const data = await callGemini(
        contextualPrompt,
        msg.apiKey,
        msg.model,
        msg.deviceType
      );

      // Debug: Log el JSON generado para verificar la estructura
      console.log("JSON generado por Gemini:", JSON.stringify(data, null, 2));
      console.log("Dispositivo seleccionado:", msg.deviceType);

      // Si hay frame seleccionado, editarlo en lugar de crear uno nuevo
      if (msg.selectedFrame) {
        await updateExistingFrame(data.frames, msg.selectedFrame.id);
      } else {
        await createOrUpdate(data.frames);
      }

      figma.notify("✅ ¡Diseño generado exitosamente!");
      sendUIMessage("success", "¡Diseño generado exitosamente!", "success");
    } catch (e) {
      console.error("Error con Gemini:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      figma.notify("⚠️ Error: " + errorMessage);
      sendUIMessage("alert", errorMessage, "error");
    }
  }
};

// Función para actualizar un frame existente por ID
async function updateExistingFrame(frames: MCPFrameNode[], frameId: string) {
  const existingFrame = figma.getNodeById(frameId) as FrameNode | null;

  if (!existingFrame || existingFrame.type !== "FRAME") {
    throw new Error("Frame no encontrado o no es válido");
  }

  // Cargar fuente por defecto
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  // Usar el primer frame de la respuesta para actualizar el existente
  if (frames.length > 0) {
    const frameDef = frames[0];

    // Limpiar contenido existente
    existingFrame.children.forEach((c) => c.remove());

    // Agregar nuevos elementos
    for (const n of frameDef.nodes) {
      await addNodeToFrame(existingFrame, n);
    }
  }
}

async function createOrUpdate(frames: MCPFrameNode[]) {
  // Cargar fuente por defecto para textos
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  for (const frameDef of frames) {
    console.log("Creando frame:", frameDef.name, "con nodos:", frameDef.nodes);

    let frame = figma.currentPage.findOne(
      (n) => n.type === "FRAME" && n.name === frameDef.name
    ) as FrameNode | undefined;

    if (!frame) {
      frame = figma.createFrame();
      frame.name = frameDef.name;

      // Buscar el primer nodo FRAME para obtener las dimensiones correctas
      const mainFrameNode = frameDef.nodes.find((n) => n.type === "FRAME");

      if (mainFrameNode && mainFrameNode.width && mainFrameNode.height) {
        console.log(
          "Usando dimensiones del nodo FRAME:",
          mainFrameNode.width,
          "x",
          mainFrameNode.height
        );
        frame.resize(mainFrameNode.width, mainFrameNode.height);
      } else {
        console.warn("No se encontró nodo FRAME principal, usando fallback");
        // Fallback inteligente basado en el contenido
        const hasLargeElements = frameDef.nodes.some(
          (n) => (n.width && n.width > 600) || (n.height && n.height > 600)
        );

        if (hasLargeElements) {
          frame.resize(1200, 800); // Desktop
          console.log("Detectado contenido desktop, usando 1200x800");
        } else {
          frame.resize(375, 812); // Mobile fallback
          console.log("Usando fallback mobile 375x812");
        }
      }

      figma.currentPage.appendChild(frame);

      // Log final de dimensiones
      console.log(
        "Frame creado con dimensiones finales:",
        frame.width,
        "x",
        frame.height
      );
    }

    // Limpia nodos existentes para reemplazar
    frame.children.forEach((c) => c.remove());

    // Procesar nodos con lógica mejorada
    let hasMainFrame = false;
    let mainFrameIndex = -1;

    // Buscar si hay un FRAME principal en la lista
    for (let i = 0; i < frameDef.nodes.length; i++) {
      if (frameDef.nodes[i].type === "FRAME") {
        hasMainFrame = true;
        mainFrameIndex = i;
        console.log(`FRAME principal encontrado en índice ${i}`);
        break;
      }
    }

    if (hasMainFrame && mainFrameIndex !== -1) {
      // Procesar el FRAME principal primero
      const mainFrameNode = frameDef.nodes[mainFrameIndex];
      console.log("Procesando FRAME principal con sus propiedades");
      await addNodeToFrame(frame, mainFrameNode);

      // Procesar todos los demás nodos como hijos del frame principal
      console.log(
        `Procesando ${
          frameDef.nodes.length - 1
        } elementos hermanos como hijos del frame principal`
      );
      for (let i = 0; i < frameDef.nodes.length; i++) {
        if (i !== mainFrameIndex) {
          // Omitir el frame principal ya procesado
          await addNodeToFrame(frame, frameDef.nodes[i]);
        }
      }
    } else {
      // Si no hay frame principal, procesar todos los nodos normalmente
      console.log("No hay FRAME principal, procesando todos los nodos");
      for (const n of frameDef.nodes) {
        await addNodeToFrame(frame, n);
      }
    }

    // Si el frame quedó vacío después de procesar todo, agregar contenido placeholder
    if (frame.children.length === 0) {
      console.warn("Frame quedó vacío, agregando contenido placeholder");

      // Crear contenido de ejemplo basado en el prompt
      const placeholderText = figma.createText();
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      placeholderText.fontName = { family: "Inter", style: "Regular" };
      placeholderText.characters = "Contenido generado";
      placeholderText.fontSize = 16;
      placeholderText.fills = [
        { type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } },
      ];

      // Centrar el texto en el frame
      placeholderText.x = frame.width / 2 - 50;
      placeholderText.y = frame.height / 2;

      frame.appendChild(placeholderText);
    }

    console.log(
      "Frame procesado con",
      frame.children.length,
      "elementos hijos"
    );
  }
}

// Función auxiliar para agregar nodos a un frame
async function addNodeToFrame(frame: FrameNode, n: MCPNode) {
  let node: SceneNode;

  // Si el nodo es un FRAME y es el primer nodo, aplicar sus propiedades al frame principal
  if (n.type === "FRAME" && frame.children.length === 0) {
    console.log(
      "Aplicando propiedades del nodo FRAME principal al frame contenedor"
    );

    // Aplicar las propiedades del FRAME al frame principal
    if (n.fills && n.fills.length > 0) {
      try {
        const figmaFills = n.fills.map((fill) => {
          const figmaFill: any = {
            type: fill.type,
            color: {
              r: Math.max(0, Math.min(1, fill.color.r)),
              g: Math.max(0, Math.min(1, fill.color.g)),
              b: Math.max(0, Math.min(1, fill.color.b)),
            },
          };

          if (fill.color.a !== undefined && fill.color.a !== 1) {
            figmaFill.opacity = Math.max(0, Math.min(1, fill.color.a));
          }

          return figmaFill;
        });

        frame.fills = figmaFills;
        console.log("Aplicado fill al frame principal");
      } catch (fillError) {
        console.warn("Error aplicando fills al frame principal:", fillError);
      }
    }

    // Aplicar auto-layout si está especificado
    if (n.layoutMode && n.layoutMode !== "NONE") {
      try {
        frame.layoutMode = n.layoutMode;

        // Configurar padding con validación
        if (n.paddingTop !== undefined && n.paddingTop >= 0)
          frame.paddingTop = n.paddingTop;
        if (n.paddingBottom !== undefined && n.paddingBottom >= 0)
          frame.paddingBottom = n.paddingBottom;
        if (n.paddingLeft !== undefined && n.paddingLeft >= 0)
          frame.paddingLeft = n.paddingLeft;
        if (n.paddingRight !== undefined && n.paddingRight >= 0)
          frame.paddingRight = n.paddingRight;

        // Configurar espaciado entre elementos
        if (n.itemSpacing !== undefined && n.itemSpacing >= 0)
          frame.itemSpacing = n.itemSpacing;

        // Configurar modos de tamaño con validación
        if (
          n.primaryAxisSizingMode &&
          ["FIXED", "AUTO"].indexOf(n.primaryAxisSizingMode) !== -1
        ) {
          frame.primaryAxisSizingMode = n.primaryAxisSizingMode;
        }
        if (
          n.counterAxisSizingMode &&
          ["FIXED", "AUTO"].indexOf(n.counterAxisSizingMode) !== -1
        ) {
          frame.counterAxisSizingMode = n.counterAxisSizingMode;
        }

        // Configurar alineación con validación
        if (
          n.primaryAxisAlignItems &&
          ["MIN", "CENTER", "MAX", "SPACE_BETWEEN"].indexOf(
            n.primaryAxisAlignItems
          ) !== -1
        ) {
          frame.primaryAxisAlignItems = n.primaryAxisAlignItems;
        }
        if (
          n.counterAxisAlignItems &&
          ["MIN", "CENTER", "MAX"].indexOf(n.counterAxisAlignItems) !== -1
        ) {
          frame.counterAxisAlignItems = n.counterAxisAlignItems;
        }

        console.log("Aplicado auto-layout al frame principal");
      } catch (layoutError) {
        console.warn(
          "Error configurando auto-layout en frame principal:",
          layoutError
        );
      }
    }

    // Aplicar radio de esquinas
    if (n.cornerRadius) frame.cornerRadius = n.cornerRadius;

    console.log(
      "Propiedades del FRAME principal aplicadas, ahora procesando sus children"
    );

    // Procesar los children del FRAME principal (puede ser 'children' o 'nodes')
    const nodeChildren = (n as any).children || (n as any).nodes;
    if (nodeChildren && nodeChildren.length > 0) {
      console.log(
        "Procesando",
        nodeChildren.length,
        "children del FRAME principal"
      );
      for (const child of nodeChildren) {
        await addNodeToFrame(frame, child);
      }
    } else {
      console.log("No se encontraron children o nodes en el FRAME principal");
    }

    // No agregamos este FRAME como nodo hijo, solo procesamos su contenido
    return;
  }

  switch (n.type) {
    case "TEXT":
      const t = figma.createText();

      // Cargar fuente por defecto primero
      try {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        t.fontName = { family: "Inter", style: "Regular" };
      } catch (fontError) {
        console.warn("Error cargando fuente Inter Regular:", fontError);
      }

      // Soporte para tanto 'text' como 'characters' (Gemini usa 'characters')
      const textContent = (n as any).characters || n.text || "Texto";
      t.characters = textContent;
      console.log(`Asignando texto: "${textContent}"`);

      // Aplicar estilos de texto con mejor manejo de errores
      if (n.fontSize && n.fontSize > 0) {
        t.fontSize = Math.max(8, n.fontSize); // Mínimo 8px
        console.log(`Aplicando fontSize: ${t.fontSize}`);
      } else {
        t.fontSize = 16; // Fallback a tamaño visible
        console.log("Usando fontSize fallback: 16");
      }

      if (n.fontWeight) {
        const weight =
          n.fontWeight === "bold"
            ? "Bold"
            : n.fontWeight === "medium"
            ? "Medium"
            : n.fontWeight === "light"
            ? "Light"
            : "Regular";

        try {
          await figma.loadFontAsync({ family: "Inter", style: weight });
          t.fontName = { family: "Inter", style: weight };
          console.log(`Aplicando fontWeight: ${weight}`);
        } catch (fontError) {
          console.warn(
            `No se pudo cargar fuente Inter ${weight}, usando Regular`
          );
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          t.fontName = { family: "Inter", style: "Regular" };
        }
      }

      // Mejorar alineación de texto
      if (n.textAlign) {
        try {
          const align = n.textAlign.toUpperCase() as
            | "LEFT"
            | "CENTER"
            | "RIGHT";
          if (["LEFT", "CENTER", "RIGHT"].indexOf(align) !== -1) {
            t.textAlignHorizontal = align;
          } else {
            // Fallback para casos donde viene en minúsculas o mal formateado
            const lowerAlign = n.textAlign.toLowerCase();
            if (lowerAlign === "center") t.textAlignHorizontal = "CENTER";
            else if (lowerAlign === "right") t.textAlignHorizontal = "RIGHT";
            else t.textAlignHorizontal = "LEFT";
          }
        } catch (alignError) {
          console.warn("Error aplicando alineación de texto:", alignError);
          t.textAlignHorizontal = "LEFT"; // Fallback seguro
        }
      }

      // Redimensionar si se especifica y NO estamos en auto-layout
      if (n.width && n.height && frame.layoutMode === "NONE") {
        t.resize(n.width, n.height);
        console.log(`Redimensionando texto a ${n.width}x${n.height}`);
      } else if (frame.layoutMode !== "NONE") {
        // En auto-layout, permitir que el texto se auto-dimensione
        console.log("Texto en auto-layout, permitiendo auto-sizing");
        // Configurar textAutoResize si está disponible
        if ("textAutoResize" in t) {
          (t as any).textAutoResize = "WIDTH_AND_HEIGHT";
        }
      }

      // ASEGURAR que todos los TEXT tengan fills - agregar automáticamente si faltan
      if (!n.fills || n.fills.length === 0) {
        console.log("TEXT sin fills, agregando color negro por defecto");
        (n as any).fills = [
          {
            type: "SOLID",
            color: { r: 0.1, g: 0.1, b: 0.1 }, // Negro para buena visibilidad
          },
        ];
      }

      node = t;
      break;

    case "RECTANGLE":
      const r = figma.createRectangle();

      // Manejar dimensiones que pueden ser "auto" o números
      const rectWidth = typeof n.width === "string" ? 100 : n.width ?? 100;
      const rectHeight = typeof n.height === "string" ? 100 : n.height ?? 100;
      r.resize(rectWidth, rectHeight);

      // Aplicar radio de esquinas
      if (n.cornerRadius) r.cornerRadius = n.cornerRadius;

      // Los RECTANGLEs no pueden contener children directamente en Figma
      // Si el JSON incluye children en RECTANGLE, deberían ser convertidos a FRAME

      node = r;
      break;

    case "FRAME":
      const f = figma.createFrame();
      f.resize(n.width ?? 100, n.height ?? 100);

      // Configurar auto-layout si está especificado
      if (n.layoutMode && n.layoutMode !== "NONE") {
        try {
          f.layoutMode = n.layoutMode;

          // Configurar padding con validación
          if (n.paddingTop !== undefined && n.paddingTop >= 0)
            f.paddingTop = n.paddingTop;
          if (n.paddingBottom !== undefined && n.paddingBottom >= 0)
            f.paddingBottom = n.paddingBottom;
          if (n.paddingLeft !== undefined && n.paddingLeft >= 0)
            f.paddingLeft = n.paddingLeft;
          if (n.paddingRight !== undefined && n.paddingRight >= 0)
            f.paddingRight = n.paddingRight;

          // Configurar espaciado entre elementos
          if (n.itemSpacing !== undefined && n.itemSpacing >= 0)
            f.itemSpacing = n.itemSpacing;

          // Configurar modos de tamaño con validación
          if (
            n.primaryAxisSizingMode &&
            ["FIXED", "AUTO"].indexOf(n.primaryAxisSizingMode) !== -1
          ) {
            f.primaryAxisSizingMode = n.primaryAxisSizingMode;
          }
          if (
            n.counterAxisSizingMode &&
            ["FIXED", "AUTO"].indexOf(n.counterAxisSizingMode) !== -1
          ) {
            f.counterAxisSizingMode = n.counterAxisSizingMode;
          }

          // Configurar alineación con validación
          if (
            n.primaryAxisAlignItems &&
            ["MIN", "CENTER", "MAX", "SPACE_BETWEEN"].indexOf(
              n.primaryAxisAlignItems
            ) !== -1
          ) {
            f.primaryAxisAlignItems = n.primaryAxisAlignItems;
          }
          if (
            n.counterAxisAlignItems &&
            ["MIN", "CENTER", "MAX"].indexOf(n.counterAxisAlignItems) !== -1
          ) {
            f.counterAxisAlignItems = n.counterAxisAlignItems;
          }
        } catch (layoutError) {
          console.warn("Error configurando auto-layout:", layoutError);
          // Continuar sin auto-layout si hay error
        }
      }

      // Aplicar radio de esquinas
      if (n.cornerRadius) f.cornerRadius = n.cornerRadius;

      // Procesar children recursivamente si los hay (puede ser 'children' o 'nodes')
      const frameChildren = (n as any).children || (n as any).nodes;
      if (frameChildren && frameChildren.length > 0) {
        console.log(
          `Procesando ${frameChildren.length} children del FRAME ${n.type}`
        );
        for (const child of frameChildren) {
          await addNodeToFrame(f, child);
        }
      }

      node = f;
      break;

    case "IMAGE":
      const img = figma.createRectangle();
      img.resize(n.width ?? 100, n.height ?? 100);

      // Estilo de placeholder más atractivo
      img.fills = [
        {
          type: "SOLID",
          color: { r: 0.92, g: 0.94, b: 0.98 },
        },
      ];

      // Sombra sutil para imágenes
      img.effects = [
        {
          type: "DROP_SHADOW",
          visible: true,
          blendMode: "NORMAL",
          color: { r: 0, g: 0, b: 0, a: 0.08 },
          offset: { x: 0, y: 2 },
          radius: 4,
          spread: 0,
        },
      ];

      if (n.cornerRadius) img.cornerRadius = n.cornerRadius;

      node = img;
      break;

    default:
      const df = figma.createFrame();
      df.resize(n.width ?? 100, n.height ?? 100);
      node = df;
  }

  // Posicionamiento solo si el frame padre no tiene auto-layout
  if (frame.layoutMode === "NONE") {
    node.x = n.x;
    node.y = n.y;
    console.log(
      `Posicionando manualmente elemento ${n.type} en (${n.x}, ${n.y})`
    );
  } else {
    console.log(`Elemento ${n.type} será posicionado por auto-layout`);
  }

  // Aplicar rellenos/colores con mejor manejo de transparencia
  if (n.fills && n.fills.length > 0 && "fills" in node) {
    try {
      console.log(
        `Aplicando ${n.fills.length} fills a elemento ${n.type}:`,
        n.fills
      );
      const figmaFills = n.fills.map((fill) => {
        // Verificar si el fill tiene color antes de acceder a él
        if (!fill.color) {
          // Para fills sin color, usar un color por defecto
          return {
            type: "SOLID",
            color: { r: 0.9, g: 0.9, b: 0.9 },
          };
        }

        const figmaFill: any = {
          type: fill.type,
          color: {
            r: Math.max(0, Math.min(1, fill.color.r)), // Clamp entre 0 y 1
            g: Math.max(0, Math.min(1, fill.color.g)),
            b: Math.max(0, Math.min(1, fill.color.b)),
          },
        };

        // Manejar transparencia correctamente
        if (fill.color.a !== undefined && fill.color.a !== 1) {
          figmaFill.opacity = Math.max(0, Math.min(1, fill.color.a));
        }

        return figmaFill;
      });

      (node as GeometryMixin).fills = figmaFills;
      console.log("Fills aplicados exitosamente");

      // Aplicar opacity del primer fill si existe
      const firstFill = n.fills[0];
      if (firstFill?.color?.a !== undefined && firstFill.color.a < 1) {
        node.opacity = Math.max(0, Math.min(1, firstFill.color.a));
        console.log(`Opacity aplicada: ${node.opacity}`);
      }
    } catch (fillError) {
      console.warn("Error aplicando fills:", fillError);
      // Aplicar color fallback
      if ("fills" in node) {
        (node as GeometryMixin).fills = [
          {
            type: "SOLID",
            color: { r: 0.9, g: 0.9, b: 0.9 },
          },
        ];
        console.log("Color fallback aplicado");
      }
    }
  } else if ("fills" in node) {
    // Si no hay fills especificados, aplicar un color por defecto visible
    console.log(
      `No fills especificados para ${n.type}, aplicando color por defecto`
    );
    (node as GeometryMixin).fills = [
      {
        type: "SOLID",
        color:
          n.type === "TEXT" ? { r: 0.1, g: 0.1, b: 0.1 } : { r: 1, g: 1, b: 1 },
      },
    ];
  }

  // Aplicar bordes/strokes con validación
  if (n.strokes && "strokes" in node) {
    try {
      const figmaStrokes = n.strokes.map((stroke) => ({
        type: stroke.type,
        color: {
          r: Math.max(0, Math.min(1, stroke.color.r)),
          g: Math.max(0, Math.min(1, stroke.color.g)),
          b: Math.max(0, Math.min(1, stroke.color.b)),
        },
      }));
      (node as GeometryMixin).strokes = figmaStrokes;

      // Aplicar grosor del borde con validación
      if (
        n.strokeWeight !== undefined &&
        n.strokeWeight >= 0 &&
        "strokeWeight" in node
      ) {
        (node as GeometryMixin).strokeWeight = n.strokeWeight;
      }
    } catch (strokeError) {
      console.warn("Error aplicando strokes:", strokeError);
    }
  }

  // Aplicar opacidad con validación
  if (n.opacity !== undefined) {
    node.opacity = Math.max(0, Math.min(1, n.opacity));
  }

  // Aplicar efectos (sombras) con validación mejorada
  if (n.effects && n.effects.length > 0 && "effects" in node) {
    try {
      const figmaEffects = n.effects.map((effect) => {
        // Asegurar que todos los campos requeridos estén presentes
        const safeEffect: any = {
          type: effect.type || "DROP_SHADOW",
          visible: true,
          blendMode: "NORMAL",
        };

        // Color con validación
        if (effect.color) {
          safeEffect.color = {
            r: Math.max(0, Math.min(1, effect.color.r || 0)),
            g: Math.max(0, Math.min(1, effect.color.g || 0)),
            b: Math.max(0, Math.min(1, effect.color.b || 0)),
            a: Math.max(0, Math.min(1, effect.color.a || 0.3)),
          };
        } else {
          // Color por defecto para sombra
          safeEffect.color = { r: 0, g: 0, b: 0, a: 0.25 };
        }

        // Offset con validación
        if (effect.offset) {
          safeEffect.offset = {
            x: effect.offset.x || 0,
            y: effect.offset.y || 2,
          };
        } else {
          safeEffect.offset = { x: 0, y: 2 };
        }

        // Radius y spread
        safeEffect.radius = Math.max(0, effect.radius || 4);
        safeEffect.spread = Math.max(0, effect.spread || 0);

        return safeEffect;
      });

      (node as BlendMixin).effects = figmaEffects;
      console.log("Efectos aplicados exitosamente");
    } catch (effectError) {
      console.warn("Error aplicando efectos:", effectError);
      // Aplicar sombra simple por defecto
      try {
        (node as BlendMixin).effects = [
          {
            type: "DROP_SHADOW",
            visible: true,
            blendMode: "NORMAL",
            color: { r: 0, g: 0, b: 0, a: 0.1 },
            offset: { x: 0, y: 2 },
            radius: 4,
            spread: 0,
          },
        ];
        console.log("Sombra por defecto aplicada");
      } catch (fallbackError) {
        console.warn("No se pudo aplicar efectos:", fallbackError);
      }
    }
  }

  frame.appendChild(node);

  // Debug log con soporte para both text y characters
  const debugText = (n as any).characters || n.text || "N/A";
  console.log(
    `✅ Elemento ${n.type} agregado al frame. Texto: "${debugText}", Dimensiones: ${node.width}x${node.height}`
  );

  // Si es una imagen, agregar emoji indicativo centrado
  if (n.type === "IMAGE") {
    try {
      const imgIcon = figma.createText();

      // Elegir emoji según el tipo de imagen
      const imageType = n.imageUrl?.toLowerCase() || "photo";
      const emoji =
        imageType.includes("avatar") || imageType.includes("profile")
          ? "👤"
          : imageType.includes("icon")
          ? "⭐"
          : imageType.includes("logo")
          ? "🏷️"
          : imageType.includes("photo")
          ? "📸"
          : "🖼️";

      imgIcon.characters = emoji;
      imgIcon.fontSize = Math.min(n.width ?? 100, n.height ?? 100) * 0.3;
      imgIcon.textAlignHorizontal = "CENTER";

      // Centrar perfectamente el emoji
      const iconWidth = imgIcon.fontSize;
      imgIcon.x = n.x + (n.width ?? 100) / 2 - iconWidth / 2;
      imgIcon.y = n.y + (n.height ?? 100) / 2 - iconWidth / 2;

      frame.appendChild(imgIcon);
    } catch (iconError) {
      console.warn("Error agregando icono de imagen:", iconError);
    }
  }
}
