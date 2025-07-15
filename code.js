"use strict";
// Figma plugin entrypoint – TypeScript
// Muestra UI opcional, o bien espera mensajes desde Cursor/Claude vía MCP.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Oculta UI si se abrió desde mensaje externo
figma.showUI(__html__, { width: 320, height: 640 });
figma.on("run", () => {
    // cierra la UI inmediata si querés modo headless
    // figma.ui.close();
});
function callGemini(prompt, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const systemPrompt = `Eres un diseñador UX/UI EXPERTO con años de experiencia creando interfaces modernas y atractivas. Aplicas las mejores prácticas de diseño: jerarquía visual, espaciado consistente, tipografía legible, colores armónicos, y accesibilidad.

RESPONDE SOLO con JSON válido siguiendo este formato exacto:

{
  "frames": [
    {
      "name": "ScreenName",
      "nodes": [
        {
          "type": "TEXT",
          "text": "Contenido del texto",
          "x": 20,
          "y": 50,
          "width": 335,
          "height": 40,
          "fontSize": 24,
          "fontWeight": "bold",
          "textAlign": "CENTER",
          "fills": [{"type": "SOLID", "color": {"r": 0.1, "g": 0.1, "b": 0.1, "a": 1}}]
        },
        {
          "type": "RECTANGLE",
          "x": 20,
          "y": 100,
          "width": 335,
          "height": 50,
          "cornerRadius": 12,
          "fills": [{"type": "SOLID", "color": {"r": 0.95, "g": 0.95, "b": 0.97, "a": 1}}],
          "effects": [{"type": "DROP_SHADOW", "color": {"r": 0, "g": 0, "b": 0, "a": 0.1}, "offset": {"x": 0, "y": 2}, "radius": 8}]
        },
        {
          "type": "IMAGE",
          "x": 20,
          "y": 200,
          "width": 100,
          "height": 100,
          "cornerRadius": 50,
          "imageUrl": "placeholder"
        }
      ]
    }
  ]
}

REGLAS DE DISEÑO OBLIGATORIAS:
- Canvas móvil: 375x812px (iPhone estándar)
- Márgenes: mínimo 20px desde bordes
- Espaciado entre elementos: 16px mínimo
- Botones: altura 48-56px, cornerRadius 8-16px
- Campos de entrada: altura 48px, cornerRadius 8px
- Textos de título: fontSize 24-32px, fontWeight "bold"
- Textos de cuerpo: fontSize 16px, fontWeight "normal"
- Textos pequeños: fontSize 14px
- Usa sombras sutiles en botones y cards: DROP_SHADOW con alpha 0.1-0.2
- Colores modernos: grises suaves, azules, verdes, evita colores saturados
- Imágenes: usa cornerRadius para redondear (50% para círculos)
- Botones primarios: colores vibrantes con contraste
- Botones secundarios: fondos claros con bordes

TIPOS DISPONIBLES: TEXT, RECTANGLE, FRAME, IMAGE

EJEMPLOS DE COLORES PROFESIONALES:
- Texto primario: {"r": 0.1, "g": 0.1, "b": 0.1, "a": 1}
- Texto secundario: {"r": 0.4, "g": 0.4, "b": 0.4, "a": 1}
- Fondos claros: {"r": 0.98, "g": 0.98, "b": 0.98, "a": 1}
- Botón primario: {"r": 0.2, "g": 0.6, "b": 1, "a": 1}
- Botón exitoso: {"r": 0.2, "g": 0.8, "b": 0.4, "a": 1}
- Botón peligro: {"r": 1, "g": 0.3, "b": 0.3, "a": 1}

Crea diseños PROFESIONALES, MODERNOS y FUNCIONALES.`;
        const body = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt + "\n\nPrompt del usuario: " + prompt }],
                },
            ],
            generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 2048,
            },
        };
        // Lógica de reintento para manejar sobrecarga del servidor
        let lastError = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const res = yield fetch(GEMINI_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                if (!res.ok) {
                    const errText = yield res.text();
                    const error = new Error(`Gemini API ${res.status}: ${errText}`);
                    // Si es error 503 (sobrecarga), reintentar después de un delay
                    if (res.status === 503 && attempt < 3) {
                        lastError = error;
                        figma.notify(`⏳ Reintentando... (${attempt}/3)`);
                        yield new Promise((resolve) => setTimeout(resolve, 2000 * attempt)); // Delay incremental
                        continue;
                    }
                    throw error;
                }
                const data = yield res.json();
                if (!data.candidates ||
                    !data.candidates[0] ||
                    !data.candidates[0].content) {
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
                    return JSON.parse(responseText);
                }
                catch (error) {
                    throw new Error(`Error al parsear respuesta de Gemini: ${responseText}`);
                }
            }
            catch (error) {
                lastError = error;
                // Si es el último intento, lanzar el error
                if (attempt === 3) {
                    throw lastError;
                }
                // Para otros errores (no 503), no reintentar
                if (!error.message.includes("503")) {
                    throw error;
                }
                // Esperar antes del siguiente intento
                figma.notify(`⏳ Reintentando... (${attempt}/3)`);
                yield new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
            }
        }
        // Fallback (no debería llegar aquí)
        throw lastError || new Error("Error desconocido en Gemini");
    });
}
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type === "generate") {
        try {
            figma.notify("🤖 Generando diseño con Gemini...");
            const data = yield callGemini(msg.prompt, msg.apiKey);
            yield createOrUpdate(data.frames);
            figma.notify("✅ Vista generada/actualizada");
        }
        catch (e) {
            console.error("Error con Gemini:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            figma.notify("⚠️ Error: " + errorMessage);
        }
    }
});
function createOrUpdate(frames) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        // Cargar fuente por defecto para textos
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
        for (const frameDef of frames) {
            let frame = figma.currentPage.findOne((n) => n.type === "FRAME" && n.name === frameDef.name);
            if (!frame) {
                frame = figma.createFrame();
                frame.name = frameDef.name;
                frame.resize(375, 812);
                figma.currentPage.appendChild(frame);
            }
            // Limpia nodos existentes para reemplazar (opcional: diff en lugar de wipe)
            frame.children.forEach((c) => c.remove());
            for (const n of frameDef.nodes) {
                let node;
                switch (n.type) {
                    case "TEXT":
                        const t = figma.createText();
                        t.characters = (_a = n.text) !== null && _a !== void 0 ? _a : "";
                        // Aplicar estilos de texto
                        if (n.fontSize)
                            t.fontSize = n.fontSize;
                        if (n.fontWeight) {
                            const weight = n.fontWeight === "bold"
                                ? "Bold"
                                : n.fontWeight === "medium"
                                    ? "Medium"
                                    : n.fontWeight === "light"
                                        ? "Light"
                                        : "Regular";
                            yield figma.loadFontAsync({ family: "Inter", style: weight });
                            t.fontName = { family: "Inter", style: weight };
                        }
                        if (n.textAlign) {
                            const align = n.textAlign.toUpperCase();
                            t.textAlignHorizontal = align;
                        }
                        node = t;
                        break;
                    case "RECTANGLE":
                        const r = figma.createRectangle();
                        r.resize((_b = n.width) !== null && _b !== void 0 ? _b : 100, (_c = n.height) !== null && _c !== void 0 ? _c : 100);
                        // Aplicar radio de esquinas
                        if (n.cornerRadius)
                            r.cornerRadius = n.cornerRadius;
                        node = r;
                        break;
                    case "IMAGE":
                        // Para imágenes usamos un rectángulo con placeholder por ahora
                        const img = figma.createRectangle();
                        img.resize((_d = n.width) !== null && _d !== void 0 ? _d : 100, (_e = n.height) !== null && _e !== void 0 ? _e : 100);
                        // Placeholder para imagen
                        img.fills = [
                            {
                                type: "SOLID",
                                color: { r: 0.9, g: 0.9, b: 0.95 },
                            },
                        ];
                        if (n.cornerRadius)
                            img.cornerRadius = n.cornerRadius;
                        node = img;
                        break;
                    default:
                        const f = figma.createFrame();
                        f.resize((_f = n.width) !== null && _f !== void 0 ? _f : 100, (_g = n.height) !== null && _g !== void 0 ? _g : 100);
                        node = f;
                }
                // Posicionamiento
                node.x = n.x;
                node.y = n.y;
                // Aplicar rellenos/colores (limpiar propiedad 'a' que Figma no reconoce)
                if (n.fills && "fills" in node) {
                    const cleanFills = n.fills.map((fill) => ({
                        type: fill.type,
                        color: {
                            r: fill.color.r,
                            g: fill.color.g,
                            b: fill.color.b,
                            // Removemos la propiedad 'a' porque Figma no la reconoce
                        },
                    }));
                    node.fills = cleanFills;
                    // Si hay transparencia en el color, aplicarla como opacity del nodo
                    if (((_j = (_h = n.fills[0]) === null || _h === void 0 ? void 0 : _h.color) === null || _j === void 0 ? void 0 : _j.a) !== undefined && n.fills[0].color.a < 1) {
                        node.opacity = n.fills[0].color.a;
                    }
                }
                // Aplicar opacidad
                if (n.opacity !== undefined) {
                    node.opacity = n.opacity;
                }
                // Aplicar efectos (sombras)
                if (n.effects && "effects" in node) {
                    const figmaEffects = n.effects.map((effect) => ({
                        type: effect.type,
                        visible: true,
                        blendMode: "NORMAL",
                        color: effect.color,
                        offset: effect.offset,
                        radius: effect.radius,
                        spread: effect.spread || 0,
                    }));
                    node.effects = figmaEffects;
                }
                frame.appendChild(node);
            }
        }
    });
}
