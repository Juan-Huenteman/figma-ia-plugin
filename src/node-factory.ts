import { MCPNode } from "./types";
import { FONT_CONFIG, PROFESSIONAL_COLORS, DEFAULT_SHADOW } from "./config";

export class NodeFactory {
  /**
   * Crea un nodo según su tipo
   */
  static async createNode(
    nodeDefinition: MCPNode,
    parentFrame: FrameNode
  ): Promise<SceneNode> {
    switch (nodeDefinition.type) {
      case "TEXT":
        return this.createTextNode(nodeDefinition, parentFrame);
      case "RECTANGLE":
        return this.createRectangleNode(nodeDefinition);
      case "FRAME":
        return this.createFrameNode(nodeDefinition);
      case "IMAGE":
        return this.createImageNode(nodeDefinition);
      default:
        // Fallback a frame por defecto
        return this.createFrameNode(nodeDefinition);
    }
  }

  /**
   * Crea un nodo de texto
   */
  private static async createTextNode(
    nodeDefinition: MCPNode,
    parentFrame: FrameNode
  ): Promise<TextNode> {
    const textNode = figma.createText();

    // Cargar fuente por defecto
    try {
      await figma.loadFontAsync({
        family: FONT_CONFIG.family,
        style: FONT_CONFIG.styles.regular,
      });
      textNode.fontName = {
        family: FONT_CONFIG.family,
        style: FONT_CONFIG.styles.regular,
      };
    } catch (fontError) {
      console.warn("Error cargando fuente Inter Regular:", fontError);
    }

    // Configurar texto
    const textContent =
      nodeDefinition.characters || nodeDefinition.text || "Texto";
    textNode.characters = textContent;

    // Configurar tamaño de fuente
    if (nodeDefinition.fontSize && nodeDefinition.fontSize > 0) {
      textNode.fontSize = Math.max(
        FONT_CONFIG.minSize,
        nodeDefinition.fontSize
      );
    } else {
      textNode.fontSize = FONT_CONFIG.defaultSize;
    }

    // Configurar peso de fuente
    if (nodeDefinition.fontWeight) {
      await this.applyFontWeight(textNode, nodeDefinition.fontWeight);
    }

    // Configurar alineación
    if (nodeDefinition.textAlign) {
      this.applyTextAlignment(textNode, nodeDefinition.textAlign);
    }

    // Configurar dimensiones si están especificadas y NO estamos en auto-layout
    if (
      nodeDefinition.width &&
      nodeDefinition.height &&
      parentFrame.layoutMode === "NONE"
    ) {
      textNode.resize(nodeDefinition.width, nodeDefinition.height);
    } else if (parentFrame.layoutMode !== "NONE") {
      // En auto-layout, permitir que el texto se auto-dimensione
      if ("textAutoResize" in textNode) {
        (textNode as any).textAutoResize = "WIDTH_AND_HEIGHT";
      }
    }

    // Asegurar que todos los TEXT tengan fills
    this.ensureTextFills(nodeDefinition, textNode);

    return textNode;
  }

  /**
   * Crea un nodo de rectángulo
   */
  private static createRectangleNode(nodeDefinition: MCPNode): RectangleNode {
    const rectNode = figma.createRectangle();

    // Configurar dimensiones
    const width =
      typeof nodeDefinition.width === "string"
        ? 100
        : nodeDefinition.width ?? 100;
    const height =
      typeof nodeDefinition.height === "string"
        ? 100
        : nodeDefinition.height ?? 100;
    rectNode.resize(width, height);

    // Aplicar radio de esquinas
    if (nodeDefinition.cornerRadius) {
      rectNode.cornerRadius = nodeDefinition.cornerRadius;
    }

    return rectNode;
  }

  /**
   * Crea un nodo de frame
   */
  private static createFrameNode(nodeDefinition: MCPNode): FrameNode {
    const frameNode = figma.createFrame();
    frameNode.resize(nodeDefinition.width ?? 100, nodeDefinition.height ?? 100);

    // Configurar auto-layout si está especificado
    if (nodeDefinition.layoutMode && nodeDefinition.layoutMode !== "NONE") {
      this.configureAutoLayout(frameNode, nodeDefinition);
    }

    // Aplicar radio de esquinas
    if (nodeDefinition.cornerRadius) {
      frameNode.cornerRadius = nodeDefinition.cornerRadius;
    }

    return frameNode;
  }

  /**
   * Crea un nodo de imagen (placeholder)
   */
  private static createImageNode(nodeDefinition: MCPNode): RectangleNode {
    const imgNode = figma.createRectangle();
    imgNode.resize(nodeDefinition.width ?? 100, nodeDefinition.height ?? 100);

    // Estilo de placeholder más atractivo
    imgNode.fills = [
      {
        type: "SOLID",
        color: { r: 0.92, g: 0.94, b: 0.98 },
      },
    ];

    // Sombra sutil para imágenes
    imgNode.effects = [DEFAULT_SHADOW];

    if (nodeDefinition.cornerRadius) {
      imgNode.cornerRadius = nodeDefinition.cornerRadius;
    }

    return imgNode;
  }

  /**
   * Aplica el peso de fuente
   */
  private static async applyFontWeight(
    textNode: TextNode,
    fontWeight: string
  ): Promise<void> {
    const weight = this.mapFontWeight(fontWeight);

    try {
      await figma.loadFontAsync({ family: FONT_CONFIG.family, style: weight });
      textNode.fontName = { family: FONT_CONFIG.family, style: weight };
    } catch (fontError) {
      console.warn(
        `No se pudo cargar fuente ${FONT_CONFIG.family} ${weight}, usando Regular`
      );
      await figma.loadFontAsync({
        family: FONT_CONFIG.family,
        style: FONT_CONFIG.styles.regular,
      });
      textNode.fontName = {
        family: FONT_CONFIG.family,
        style: FONT_CONFIG.styles.regular,
      };
    }
  }

  /**
   * Mapea el peso de fuente a los estilos disponibles
   */
  private static mapFontWeight(fontWeight: string): string {
    switch (fontWeight) {
      case "bold":
        return FONT_CONFIG.styles.bold;
      case "medium":
        return FONT_CONFIG.styles.medium;
      case "light":
        return FONT_CONFIG.styles.light;
      default:
        return FONT_CONFIG.styles.regular;
    }
  }

  /**
   * Aplica la alineación de texto
   */
  private static applyTextAlignment(
    textNode: TextNode,
    textAlign: string
  ): void {
    try {
      const align = textAlign.toUpperCase() as "LEFT" | "CENTER" | "RIGHT";
      if (["LEFT", "CENTER", "RIGHT"].includes(align)) {
        textNode.textAlignHorizontal = align;
      } else {
        // Fallback para casos donde viene en minúsculas
        const lowerAlign = textAlign.toLowerCase();
        if (lowerAlign === "center") textNode.textAlignHorizontal = "CENTER";
        else if (lowerAlign === "right") textNode.textAlignHorizontal = "RIGHT";
        else textNode.textAlignHorizontal = "LEFT";
      }
    } catch (alignError) {
      console.warn("Error aplicando alineación de texto:", alignError);
      textNode.textAlignHorizontal = "LEFT";
    }
  }

  /**
   * Asegura que los nodos de texto tengan fills
   */
  private static ensureTextFills(
    nodeDefinition: MCPNode,
    textNode: TextNode
  ): void {
    if (!nodeDefinition.fills || nodeDefinition.fills.length === 0) {
      // Agregar color negro por defecto para buena visibilidad
      textNode.fills = [
        {
          type: "SOLID",
          color: PROFESSIONAL_COLORS.textPrimary,
        },
      ];
    }
  }

  /**
   * Configura auto-layout para un frame
   */
  private static configureAutoLayout(
    frameNode: FrameNode,
    nodeDefinition: MCPNode
  ): void {
    try {
      frameNode.layoutMode = nodeDefinition.layoutMode!;

      // Configurar padding con validación
      if (
        nodeDefinition.paddingTop !== undefined &&
        nodeDefinition.paddingTop >= 0
      ) {
        frameNode.paddingTop = nodeDefinition.paddingTop;
      }
      if (
        nodeDefinition.paddingBottom !== undefined &&
        nodeDefinition.paddingBottom >= 0
      ) {
        frameNode.paddingBottom = nodeDefinition.paddingBottom;
      }
      if (
        nodeDefinition.paddingLeft !== undefined &&
        nodeDefinition.paddingLeft >= 0
      ) {
        frameNode.paddingLeft = nodeDefinition.paddingLeft;
      }
      if (
        nodeDefinition.paddingRight !== undefined &&
        nodeDefinition.paddingRight >= 0
      ) {
        frameNode.paddingRight = nodeDefinition.paddingRight;
      }

      // Configurar espaciado entre elementos
      if (
        nodeDefinition.itemSpacing !== undefined &&
        nodeDefinition.itemSpacing >= 0
      ) {
        frameNode.itemSpacing = nodeDefinition.itemSpacing;
      }

      // Configurar modos de tamaño
      if (
        nodeDefinition.primaryAxisSizingMode &&
        ["FIXED", "AUTO"].includes(nodeDefinition.primaryAxisSizingMode)
      ) {
        frameNode.primaryAxisSizingMode = nodeDefinition.primaryAxisSizingMode;
      }
      if (
        nodeDefinition.counterAxisSizingMode &&
        ["FIXED", "AUTO"].includes(nodeDefinition.counterAxisSizingMode)
      ) {
        frameNode.counterAxisSizingMode = nodeDefinition.counterAxisSizingMode;
      }

      // Configurar alineación
      if (
        nodeDefinition.primaryAxisAlignItems &&
        ["MIN", "CENTER", "MAX", "SPACE_BETWEEN"].includes(
          nodeDefinition.primaryAxisAlignItems
        )
      ) {
        frameNode.primaryAxisAlignItems = nodeDefinition.primaryAxisAlignItems;
      }
      if (
        nodeDefinition.counterAxisAlignItems &&
        ["MIN", "CENTER", "MAX"].includes(nodeDefinition.counterAxisAlignItems)
      ) {
        frameNode.counterAxisAlignItems = nodeDefinition.counterAxisAlignItems;
      }
    } catch (layoutError) {
      console.warn("Error configurando auto-layout:", layoutError);
    }
  }

  /**
   * Aplica posicionamiento al nodo
   */
  static positionNode(
    node: SceneNode,
    nodeDefinition: MCPNode,
    parentFrame: FrameNode
  ): void {
    // Posicionamiento solo si el frame padre no tiene auto-layout
    if (parentFrame.layoutMode === "NONE") {
      node.x = nodeDefinition.x;
      node.y = nodeDefinition.y;
    }
  }

  /**
   * Aplica fills al nodo
   */
  static applyFills(node: SceneNode, nodeDefinition: MCPNode): void {
    if (
      nodeDefinition.fills &&
      nodeDefinition.fills.length > 0 &&
      "fills" in node
    ) {
      try {
        const figmaFills = nodeDefinition.fills.map((fill) => {
          if (!fill.color) {
            return {
              type: "SOLID",
              color: PROFESSIONAL_COLORS.backgroundLight,
            };
          }

          const figmaFill: any = {
            type: fill.type,
            color: {
              r: Math.max(0, Math.min(1, fill.color.r)),
              g: Math.max(0, Math.min(1, fill.color.g)),
              b: Math.max(0, Math.min(1, fill.color.b)),
            },
          };

          // Manejar transparencia
          if (fill.color.a !== undefined && fill.color.a !== 1) {
            figmaFill.opacity = Math.max(0, Math.min(1, fill.color.a));
          }

          return figmaFill;
        });

        (node as GeometryMixin).fills = figmaFills;

        // Aplicar opacity del primer fill si existe
        const firstFill = nodeDefinition.fills[0];
        if (
          firstFill?.color?.a !== undefined &&
          firstFill.color.a < 1 &&
          "opacity" in node
        ) {
          (node as any).opacity = Math.max(0, Math.min(1, firstFill.color.a));
        }
      } catch (fillError) {
        console.warn("Error aplicando fills:", fillError);
        // Aplicar color fallback
        if ("fills" in node) {
          (node as GeometryMixin).fills = [
            {
              type: "SOLID",
              color: PROFESSIONAL_COLORS.backgroundLight,
            },
          ];
        }
      }
    } else if ("fills" in node) {
      // Si no hay fills especificados, aplicar color por defecto
      (node as GeometryMixin).fills = [
        {
          type: "SOLID",
          color:
            nodeDefinition.type === "TEXT"
              ? PROFESSIONAL_COLORS.textPrimary
              : PROFESSIONAL_COLORS.white,
        },
      ];
    }
  }

  /**
   * Aplica strokes al nodo
   */
  static applyStrokes(node: SceneNode, nodeDefinition: MCPNode): void {
    if (nodeDefinition.strokes && "strokes" in node) {
      try {
        const figmaStrokes = nodeDefinition.strokes.map((stroke) => ({
          type: stroke.type,
          color: {
            r: Math.max(0, Math.min(1, stroke.color.r)),
            g: Math.max(0, Math.min(1, stroke.color.g)),
            b: Math.max(0, Math.min(1, stroke.color.b)),
          },
        }));
        (node as GeometryMixin).strokes = figmaStrokes;

        // Aplicar grosor del borde
        if (
          nodeDefinition.strokeWeight !== undefined &&
          nodeDefinition.strokeWeight >= 0 &&
          "strokeWeight" in node
        ) {
          (node as GeometryMixin).strokeWeight = nodeDefinition.strokeWeight;
        }
      } catch (strokeError) {
        console.warn("Error aplicando strokes:", strokeError);
      }
    }
  }

  /**
   * Aplica opacidad al nodo
   */
  static applyOpacity(node: SceneNode, nodeDefinition: MCPNode): void {
    if (nodeDefinition.opacity !== undefined && 'opacity' in node) {
      (node as any).opacity = Math.max(0, Math.min(1, nodeDefinition.opacity));
    }
  }

  /**
   * Aplica efectos (sombras) al nodo
   */
  static applyEffects(node: SceneNode, nodeDefinition: MCPNode): void {
    if (
      nodeDefinition.effects &&
      nodeDefinition.effects.length > 0 &&
      "effects" in node
    ) {
      try {
        const figmaEffects = nodeDefinition.effects.map((effect) => {
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
            safeEffect.color = { r: 0, g: 0, b: 0, a: 0.25 };
          }

          // Offset, radius y spread
          safeEffect.offset = effect.offset
            ? { x: effect.offset.x || 0, y: effect.offset.y || 2 }
            : { x: 0, y: 2 };
          safeEffect.radius = Math.max(0, effect.radius || 4);
          safeEffect.spread = Math.max(0, effect.spread || 0);

          return safeEffect;
        });

        (node as BlendMixin).effects = figmaEffects;
      } catch (effectError) {
        console.warn("Error aplicando efectos:", effectError);
        // Aplicar sombra simple por defecto
        try {
          (node as BlendMixin).effects = [DEFAULT_SHADOW];
        } catch (fallbackError) {
          console.warn("No se pudo aplicar efectos:", fallbackError);
        }
      }
    }
  }

  /**
   * Aplica todas las propiedades de estilo a un nodo
   */
  static applyAllStyles(
    node: SceneNode,
    nodeDefinition: MCPNode,
    parentFrame: FrameNode
  ): void {
    this.positionNode(node, nodeDefinition, parentFrame);
    this.applyFills(node, nodeDefinition);
    this.applyStrokes(node, nodeDefinition);
    this.applyOpacity(node, nodeDefinition);
    this.applyEffects(node, nodeDefinition);
  }

  /**
   * Agrega emoji indicativo a imágenes
   */
  static async addImageIcon(
    imageNode: SceneNode,
    nodeDefinition: MCPNode,
    parentFrame: FrameNode
  ): Promise<void> {
    if (nodeDefinition.type !== "IMAGE") return;

    try {
      const imgIcon = figma.createText();

      // Elegir emoji según el tipo de imagen
      const imageType = nodeDefinition.imageUrl?.toLowerCase() || "photo";
      const emoji = this.getImageEmoji(imageType);

      imgIcon.characters = emoji;
      imgIcon.fontSize =
        Math.min(nodeDefinition.width ?? 100, nodeDefinition.height ?? 100) *
        0.3;
      imgIcon.textAlignHorizontal = "CENTER";

      // Centrar el emoji
      const iconWidth = imgIcon.fontSize;
      imgIcon.x =
        nodeDefinition.x + (nodeDefinition.width ?? 100) / 2 - iconWidth / 2;
      imgIcon.y =
        nodeDefinition.y + (nodeDefinition.height ?? 100) / 2 - iconWidth / 2;

      parentFrame.appendChild(imgIcon);
    } catch (iconError) {
      console.warn("Error agregando icono de imagen:", iconError);
    }
  }

  /**
   * Obtiene el emoji apropiado para el tipo de imagen
   */
  private static getImageEmoji(imageType: string): string {
    if (imageType.includes("avatar") || imageType.includes("profile"))
      return "👤";
    if (imageType.includes("icon")) return "⭐";
    if (imageType.includes("logo")) return "🏷️";
    if (imageType.includes("photo")) return "📸";
    return "🖼️";
  }
}
