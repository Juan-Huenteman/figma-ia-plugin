import { MCPFrameNode, MCPNode, SelectedFrame } from "./types";
import { NodeFactory } from "./node-factory";
import { getDeviceConfig } from "./config";

export class FrameManager {
  /**
   * Crea o actualiza frames basado en la definición
   */
  static async createOrUpdateFrames(frames: MCPFrameNode[]): Promise<void> {
    // Cargar fuente por defecto para textos
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });

    for (const frameDef of frames) {
      await this.processFrame(frameDef);
    }
  }

  /**
   * Actualiza un frame existente por ID
   */
  static async updateExistingFrame(
    frames: MCPFrameNode[],
    frameId: string
  ): Promise<void> {
    const existingFrame = figma.getNodeById(frameId) as FrameNode | null;

    if (!existingFrame || existingFrame.type !== "FRAME") {
      throw new Error("Frame no encontrado o no es válido");
    }

    // Cargar fuente por defecto
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });

    // Usar el primer frame de la respuesta para actualizar el existente
    if (frames.length > 0) {
      const frameDef = frames[0];
      await this.updateFrameContent(existingFrame, frameDef);
    }
  }

  /**
   * Procesa un frame individual
   */
  private static async processFrame(frameDef: MCPFrameNode): Promise<void> {
    console.log("Creando frame:", frameDef.name, "con nodos:", frameDef.nodes);

    let frame = figma.currentPage.findOne(
      (n) => n.type === "FRAME" && n.name === frameDef.name
    ) as FrameNode | undefined;

    if (!frame) {
      frame = await this.createNewFrame(frameDef);
    }

    await this.updateFrameContent(frame, frameDef);
  }

  /**
   * Crea un nuevo frame
   */
  private static async createNewFrame(
    frameDef: MCPFrameNode
  ): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.name = frameDef.name;

    // Configurar dimensiones del frame
    this.configureFrameDimensions(frame, frameDef);

    figma.currentPage.appendChild(frame);
    return frame;
  }

  /**
   * Configura las dimensiones del frame
   */
  private static configureFrameDimensions(
    frame: FrameNode,
    frameDef: MCPFrameNode
  ): void {
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

    console.log(
      "Frame creado con dimensiones finales:",
      frame.width,
      "x",
      frame.height
    );
  }

  /**
   * Actualiza el contenido de un frame
   */
  private static async updateFrameContent(
    frame: FrameNode,
    frameDef: MCPFrameNode
  ): Promise<void> {
    // Limpiar nodos existentes
    frame.children.forEach((c) => c.remove());

    // Procesar nodos con lógica mejorada
    const { hasMainFrame, mainFrameIndex } = this.analyzeFrameStructure(
      frameDef.nodes
    );

    if (hasMainFrame && mainFrameIndex !== -1) {
      await this.processMainFrameStructure(
        frame,
        frameDef.nodes,
        mainFrameIndex
      );
    } else {
      await this.processRegularStructure(frame, frameDef.nodes);
    }

    // Validar que el frame no esté vacío
    this.ensureFrameHasContent(frame);
  }

  /**
   * Analiza la estructura de nodos para detectar frame principal
   */
  private static analyzeFrameStructure(nodes: MCPNode[]): {
    hasMainFrame: boolean;
    mainFrameIndex: number;
  } {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].type === "FRAME") {
        console.log(`FRAME principal encontrado en índice ${i}`);
        return { hasMainFrame: true, mainFrameIndex: i };
      }
    }
    return { hasMainFrame: false, mainFrameIndex: -1 };
  }

  /**
   * Procesa estructura con frame principal
   */
  private static async processMainFrameStructure(
    frame: FrameNode,
    nodes: MCPNode[],
    mainFrameIndex: number
  ): Promise<void> {
    const mainFrameNode = nodes[mainFrameIndex];
    console.log("Procesando FRAME principal con sus propiedades");

    await this.processMainFrameNode(frame, mainFrameNode);

    // Procesar todos los demás nodos como hijos del frame principal
    console.log(
      `Procesando ${
        nodes.length - 1
      } elementos hermanos como hijos del frame principal`
    );

    for (let i = 0; i < nodes.length; i++) {
      if (i !== mainFrameIndex) {
        await this.addNodeToFrame(frame, nodes[i]);
      }
    }
  }

  /**
   * Procesa estructura regular sin frame principal
   */
  private static async processRegularStructure(
    frame: FrameNode,
    nodes: MCPNode[]
  ): Promise<void> {
    console.log("No hay FRAME principal, procesando todos los nodos");
    for (const node of nodes) {
      await this.addNodeToFrame(frame, node);
    }
  }

  /**
   * Procesa el nodo de frame principal
   */
  private static async processMainFrameNode(
    frame: FrameNode,
    mainFrameNode: MCPNode
  ): Promise<void> {
    // Aplicar las propiedades del FRAME al frame principal
    this.applyFrameProperties(frame, mainFrameNode);

    // Procesar los children del FRAME principal
    const nodeChildren =
      (mainFrameNode as any).children || (mainFrameNode as any).nodes;
    if (nodeChildren && nodeChildren.length > 0) {
      console.log(
        "Procesando",
        nodeChildren.length,
        "children del FRAME principal"
      );
      for (const child of nodeChildren) {
        await this.addNodeToFrame(frame, child);
      }
    } else {
      console.log("No se encontraron children o nodes en el FRAME principal");
    }
  }

  /**
   * Aplica propiedades del frame principal
   */
  private static applyFrameProperties(
    frame: FrameNode,
    mainFrameNode: MCPNode
  ): void {
    // Aplicar fills
    if (mainFrameNode.fills && mainFrameNode.fills.length > 0) {
      try {
        NodeFactory.applyFills(frame, mainFrameNode);
        console.log("Aplicado fill al frame principal");
      } catch (fillError) {
        console.warn("Error aplicando fills al frame principal:", fillError);
      }
    }

    // Aplicar auto-layout
    if (mainFrameNode.layoutMode && mainFrameNode.layoutMode !== "NONE") {
      try {
        this.configureFrameAutoLayout(frame, mainFrameNode);
        console.log("Aplicado auto-layout al frame principal");
      } catch (layoutError) {
        console.warn(
          "Error configurando auto-layout en frame principal:",
          layoutError
        );
      }
    }

    // Aplicar radio de esquinas
    if (mainFrameNode.cornerRadius) {
      frame.cornerRadius = mainFrameNode.cornerRadius;
    }
  }

  /**
   * Configura auto-layout para el frame
   */
  private static configureFrameAutoLayout(
    frame: FrameNode,
    nodeDefinition: MCPNode
  ): void {
    frame.layoutMode = nodeDefinition.layoutMode!;

    // Configurar padding con validación
    if (
      nodeDefinition.paddingTop !== undefined &&
      nodeDefinition.paddingTop >= 0
    ) {
      frame.paddingTop = nodeDefinition.paddingTop;
    }
    if (
      nodeDefinition.paddingBottom !== undefined &&
      nodeDefinition.paddingBottom >= 0
    ) {
      frame.paddingBottom = nodeDefinition.paddingBottom;
    }
    if (
      nodeDefinition.paddingLeft !== undefined &&
      nodeDefinition.paddingLeft >= 0
    ) {
      frame.paddingLeft = nodeDefinition.paddingLeft;
    }
    if (
      nodeDefinition.paddingRight !== undefined &&
      nodeDefinition.paddingRight >= 0
    ) {
      frame.paddingRight = nodeDefinition.paddingRight;
    }

    // Configurar espaciado entre elementos
    if (
      nodeDefinition.itemSpacing !== undefined &&
      nodeDefinition.itemSpacing >= 0
    ) {
      frame.itemSpacing = nodeDefinition.itemSpacing;
    }

    // Configurar modos de tamaño con validación
    if (
      nodeDefinition.primaryAxisSizingMode &&
      ["FIXED", "AUTO"].includes(nodeDefinition.primaryAxisSizingMode)
    ) {
      frame.primaryAxisSizingMode = nodeDefinition.primaryAxisSizingMode;
    }
    if (
      nodeDefinition.counterAxisSizingMode &&
      ["FIXED", "AUTO"].includes(nodeDefinition.counterAxisSizingMode)
    ) {
      frame.counterAxisSizingMode = nodeDefinition.counterAxisSizingMode;
    }

    // Configurar alineación con validación
    if (
      nodeDefinition.primaryAxisAlignItems &&
      ["MIN", "CENTER", "MAX", "SPACE_BETWEEN"].includes(
        nodeDefinition.primaryAxisAlignItems
      )
    ) {
      frame.primaryAxisAlignItems = nodeDefinition.primaryAxisAlignItems;
    }
    if (
      nodeDefinition.counterAxisAlignItems &&
      ["MIN", "CENTER", "MAX"].includes(nodeDefinition.counterAxisAlignItems)
    ) {
      frame.counterAxisAlignItems = nodeDefinition.counterAxisAlignItems;
    }
  }

  /**
   * Agrega un nodo al frame
   */
  private static async addNodeToFrame(
    frame: FrameNode,
    nodeDefinition: MCPNode
  ): Promise<void> {
    // Si el nodo es un FRAME y es el primer nodo, aplicar sus propiedades al frame principal
    if (nodeDefinition.type === "FRAME" && frame.children.length === 0) {
      console.log(
        "Aplicando propiedades del nodo FRAME principal al frame contenedor"
      );
      this.applyFrameProperties(frame, nodeDefinition);
      // No agregamos este FRAME como nodo hijo, solo procesamos su contenido
      return;
    }

    // Crear el nodo
    const node = await NodeFactory.createNode(nodeDefinition, frame);

    // Aplicar estilos
    NodeFactory.applyAllStyles(node, nodeDefinition, frame);

    // Agregar al frame
    frame.appendChild(node);

    // Procesar children recursivamente si es un FRAME
    if (nodeDefinition.type === "FRAME") {
      const frameChildren =
        (nodeDefinition as any).children || (nodeDefinition as any).nodes;
      if (frameChildren && frameChildren.length > 0) {
        console.log(
          `Procesando ${frameChildren.length} children del FRAME ${nodeDefinition.type}`
        );
        for (const child of frameChildren) {
          await this.addNodeToFrame(node as FrameNode, child);
        }
      }
    }

    // Agregar icono para imágenes
    if (nodeDefinition.type === "IMAGE") {
      await NodeFactory.addImageIcon(node, nodeDefinition, frame);
    }

    // Debug log
    const debugText =
      (nodeDefinition as any).characters || nodeDefinition.text || "N/A";
    console.log(
      `✅ Elemento ${nodeDefinition.type} agregado al frame. Texto: "${debugText}", Dimensiones: ${node.width}x${node.height}`
    );
  }

  /**
   * Asegura que el frame tenga contenido
   */
  private static async ensureFrameHasContent(frame: FrameNode): Promise<void> {
    if (frame.children.length === 0) {
      console.warn("Frame quedó vacío, agregando contenido placeholder");

      // Crear contenido de ejemplo
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

  /**
   * Analiza frame seleccionado para obtener información de contexto
   */
  static analyzeSelectedFrame(
    selection: readonly SceneNode[]
  ): SelectedFrame | null {
    if (selection.length === 1 && selection[0].type === "FRAME") {
      const frame = selection[0] as FrameNode;
      const children = frame.children;

      // Detectar tipo de dispositivo basado en dimensiones
      let deviceType = "mobile";
      if (frame.width >= 1200) deviceType = "desktop";
      else if (frame.width >= 768) deviceType = "tablet";

      // Analizar contenido
      const styleInfo = this.analyzeFrameContent(frame, children, deviceType);

      return {
        name: frame.name,
        width: frame.width,
        height: frame.height,
        id: frame.id,
        deviceType: deviceType,
        styleInfo: styleInfo,
      };
    }

    return null;
  }

  /**
   * Analiza el contenido de un frame para generar información de estilo
   */
  private static analyzeFrameContent(
    frame: FrameNode,
    children: readonly SceneNode[],
    deviceType: string
  ) {
    let hasImages = false;
    let hasButtons = false;
    let hasInputs = false;
    const primaryColors: string[] = [];

    // Analizar elementos hijos
    children.forEach((child) => {
      // Analizar colores
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
        child.name.toLowerCase().includes("image") ||
        child.name.toLowerCase().includes("img")
      ) {
        hasImages = true;
      }
    });

    // Generar descripción automática
    let description = `Frame ${deviceType} (${frame.width}x${frame.height}) con ${children.length} elementos`;
    if (hasButtons) description += ", incluye botones";
    if (hasInputs) description += ", incluye campos de entrada";
    if (hasImages) description += ", incluye imágenes";

    return {
      backgroundColor: this.getFrameBackgroundColor(frame),
      layoutMode: "layoutMode" in frame ? frame.layoutMode : "NONE",
      padding: "paddingTop" in frame ? `${frame.paddingTop || 0}px` : "0px",
      spacing: "itemSpacing" in frame ? frame.itemSpacing || 0 : 0,
      elementCount: children.length,
      hasImages,
      hasButtons,
      hasInputs,
      primaryColors,
      description,
    };
  }

  /**
   * Obtiene el color de fondo del frame
   */
  private static getFrameBackgroundColor(frame: FrameNode): string {
    if (
      frame.fills &&
      Array.isArray(frame.fills) &&
      frame.fills[0] &&
      "color" in frame.fills[0]
    ) {
      const color = frame.fills[0].color;
      return `rgb(${Math.round(color.r * 255)}, ${Math.round(
        color.g * 255
      )}, ${Math.round(color.b * 255)})`;
    }
    return "white";
  }
}
