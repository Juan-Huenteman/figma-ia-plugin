import { GeminiResponse, DeviceType, DeviceConfig } from "./types";
import {
  GEMINI_BASE_URL,
  DEFAULT_GENERATION_CONFIG,
  RETRY_CONFIG,
  getDeviceConfig,
  getButtonConfig,
} from "./config";

export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Genera diseño usando la API de Gemini
   */
  async generateDesign(
    prompt: string,
    model: string = "gemini-1.5-flash",
    deviceType: DeviceType = "mobile"
  ): Promise<GeminiResponse> {
    const endpoint = `${GEMINI_BASE_URL}/${model}:generateContent?key=${this.apiKey}`;
    const systemPrompt = this.buildSystemPrompt(deviceType);
    const devicePrompt = this.buildDevicePrompt(deviceType);
    const fullPrompt = this.buildFullPrompt(
      prompt,
      systemPrompt,
      devicePrompt,
      deviceType
    );

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: fullPrompt }],
        },
      ],
      generationConfig: DEFAULT_GENERATION_CONFIG,
    };

    return this.makeRequestWithRetry(endpoint, body);
  }

  /**
   * Construye el prompt del sistema
   */
  private buildSystemPrompt(deviceType: DeviceType): string {
    const config = getDeviceConfig(deviceType);
    const buttonConfig = getButtonConfig(deviceType);

    return `Eres un EXPERTO UX/UI Designer. Crea interfaces modernas, profesionales y optimizadas para ${deviceType.toUpperCase()}.

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
${this.getDeviceSpecificRules(deviceType, buttonConfig)}

${this.getCommonRules()}`;
  }

  /**
   * Obtiene reglas específicas por dispositivo
   */
  private getDeviceSpecificRules(
    deviceType: DeviceType,
    buttonConfig: any
  ): string {
    switch (deviceType) {
      case "mobile":
        return `
- Botones: altura ${buttonConfig.height.min}-${buttonConfig.height.max}px, ancho máximo ${buttonConfig.maxWidth}px
- Títulos: fontSize ${buttonConfig.fontSize.title}px
- Texto: fontSize ${buttonConfig.fontSize.text}px
- Textos pequeños: fontSize ${buttonConfig.fontSize.small}px
- Input fields: altura ${buttonConfig.inputHeight}px mínimo
`;
      case "tablet":
        return `
- Botones: altura ${buttonConfig.height.min}-${buttonConfig.height.max}px, ancho máximo ${buttonConfig.maxWidth}px  
- Títulos: fontSize ${buttonConfig.fontSize.title}-40px
- Texto: fontSize ${buttonConfig.fontSize.text}px
- Textos pequeños: fontSize ${buttonConfig.fontSize.small}px
- Input fields: altura ${buttonConfig.inputHeight}px mínimo
- Más espaciado entre elementos
`;
      case "desktop":
        return `
- Botones: altura ${buttonConfig.height.min}-${buttonConfig.height.max}px, ancho máximo ${buttonConfig.maxWidth}px (no todo el ancho)
- Títulos: fontSize ${buttonConfig.fontSize.title}-48px
- Texto: fontSize ${buttonConfig.fontSize.text}px
- Textos pequeños: fontSize ${buttonConfig.fontSize.small}px
- Input fields: altura ${buttonConfig.inputHeight}px mínimo
- Layout más espacioso y centrado
- Contenido principal máximo 600px de ancho para mejor UX
`;
      default:
        return this.getDeviceSpecificRules("mobile", getButtonConfig("mobile"));
    }
  }

  /**
   * Obtiene reglas comunes para todos los dispositivos
   */
  private getCommonRules(): string {
    return `
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
✅ SIEMPRE usa las dimensiones exactas del dispositivo
✅ SIEMPRE adapta tamaños según el dispositivo
✅ SIEMPRE centra el contenido apropiadamente
✅ SIEMPRE pon todos los elementos UI dentro de "children" del FRAME principal
✅ SIEMPRE usa "characters" para el texto (no "text")

CENTRADO Y LAYOUTS:
- Para centrar: counterAxisAlignItems: "CENTER"
- Para formularios: usa paddingTop grande para centrar verticalmente
- Para desktop: limita el ancho del contenido para mejor UX
- Para texto en botón: mismas coordenadas x,y que el botón

USA AUTO-LAYOUT SIEMPRE que sea posible para layouts responsivos.`;
  }

  /**
   * Construye el prompt específico del dispositivo
   */
  private buildDevicePrompt(deviceType: DeviceType): string {
    const config = getDeviceConfig(deviceType);

    return `
DISPOSITIVO SELECCIONADO: ${deviceType.toUpperCase()}
- Canvas: ${config.width}x${config.height}px
- Márgenes: ${config.margin}px mínimo
- Adapta tamaños de fuente y elementos según las reglas de ${deviceType.toUpperCase()}

IMPORTANTE: El primer nodo FRAME debe tener exactamente estas dimensiones:
"width": ${config.width}, "height": ${config.height}
`;
  }

  /**
   * Construye el prompt completo
   */
  private buildFullPrompt(
    userPrompt: string,
    systemPrompt: string,
    devicePrompt: string,
    deviceType: DeviceType
  ): string {
    // Detectar si es un prompt de login para usar ejemplo específico
    const isLoginPrompt = this.isLoginPrompt(userPrompt);
    const loginExample =
      isLoginPrompt && deviceType === "mobile"
        ? this.getLoginSpecificPrompt()
        : "";

    return (
      systemPrompt +
      devicePrompt +
      loginExample +
      "\n\nPrompt del usuario: " +
      userPrompt
    );
  }

  /**
   * Detecta si el prompt es para una pantalla de login
   */
  private isLoginPrompt(prompt: string): boolean {
    const loginKeywords = ["login", "sesión", "password", "contraseña"];
    return loginKeywords.some((keyword) =>
      prompt.toLowerCase().includes(keyword)
    );
  }

  /**
   * Obtiene el prompt específico para login
   */
  private getLoginSpecificPrompt(): string {
    return `
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
    }
  ]
}`;
  }

  /**
   * Realiza la petición con manejo de errores y reintentos
   */
  private async makeRequestWithRetry(
    endpoint: string,
    body: any
  ): Promise<GeminiResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(
            `Gemini API ${response.status}: ${errorText}`
          );

          // Si es error 503 (sobrecarga), reintentar después de un delay
          if (response.status === 503 && attempt < RETRY_CONFIG.maxAttempts) {
            lastError = error;
            figma.notify(
              `⏳ Reintentando... (${attempt}/${RETRY_CONFIG.maxAttempts})`
            );
            await this.delay(RETRY_CONFIG.baseDelay * attempt);
            continue;
          }

          throw error;
        }

        const data = await response.json();
        return this.processGeminiResponse(data);
      } catch (error) {
        lastError = error as Error;

        // Si es el último intento, lanzar el error
        if (attempt === RETRY_CONFIG.maxAttempts) {
          throw lastError;
        }

        // Para otros errores (no 503), no reintentar
        if (!(error as Error).message.includes("503")) {
          throw error;
        }

        // Esperar antes del siguiente intento
        figma.notify(
          `⏳ Reintentando... (${attempt}/${RETRY_CONFIG.maxAttempts})`
        );
        await this.delay(RETRY_CONFIG.baseDelay * attempt);
      }
    }

    throw lastError || new Error("Error desconocido en Gemini");
  }

  /**
   * Procesa la respuesta de Gemini
   */
  private processGeminiResponse(data: any): GeminiResponse {
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

    responseText = responseText.trim();

    // Validar que el JSON esté completo
    this.validateJsonCompleteness(responseText);

    try {
      const parsedData = JSON.parse(responseText);
      this.validateResponseStructure(parsedData);
      return parsedData;
    } catch (parseError) {
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
  }

  /**
   * Valida que el JSON esté completo
   */
  private validateJsonCompleteness(responseText: string): void {
    const openBraces = (responseText.match(/{/g) || []).length;
    const closeBraces = (responseText.match(/}/g) || []).length;
    const openBrackets = (responseText.match(/\[/g) || []).length;
    const closeBrackets = (responseText.match(/]/g) || []).length;

    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      throw new Error(
        `JSON truncado - llaves: ${openBraces}/${closeBraces}, corchetes: ${openBrackets}/${closeBrackets}. Aumenta el límite de tokens.`
      );
    }
  }

  /**
   * Valida la estructura de la respuesta
   */
  private validateResponseStructure(parsedData: any): void {
    if (!parsedData.frames || !Array.isArray(parsedData.frames)) {
      throw new Error("El JSON no contiene un array 'frames' válido");
    }
  }

  /**
   * Delay helper para reintentos
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
