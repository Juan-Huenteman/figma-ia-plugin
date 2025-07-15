import { UIMessage, GenerateMessage, SelectedFrame } from "./types";
import { GeminiService } from "./gemini-service";
import { FrameManager } from "./frame-manager";
import { ErrorHandler } from "./error-handler";

export class UIManager {
  /**
   * Inicializa el UI manager y configura los handlers
   */
  static initialize(): void {
    // Mostrar UI
    figma.showUI(__html__, { width: 420, height: 900 });

    // Configurar event listeners
    this.setupEventListeners();
  }

  /**
   * Configura los event listeners para la comunicación con UI
   */
  private static setupEventListeners(): void {
    figma.on("run", () => {
      // Opcional: cerrar UI inmediatamente para modo headless
      // figma.ui.close();
    });

    figma.ui.onmessage = async (msg) => {
      try {
        await this.handleUIMessage(msg);
      } catch (error) {
        await ErrorHandler.handleError(error, "Error procesando mensaje de UI");
        this.sendErrorMessage(ErrorHandler.getErrorMessage(error));
      }
    };
  }

  /**
   * Maneja los mensajes recibidos desde la UI
   */
  private static async handleUIMessage(msg: any): Promise<void> {
    switch (msg.type) {
      case "getContext":
        await this.handleGetContext();
        break;
      case "generate":
        await this.handleGenerate(msg as GenerateMessage);
        break;
      default:
        console.warn("Tipo de mensaje no reconocido:", msg.type);
    }
  }

  /**
   * Maneja la obtención de contexto de la selección actual
   */
  private static async handleGetContext(): Promise<void> {
    try {
      const selection = figma.currentPage.selection;
      const selectedFrame = FrameManager.analyzeSelectedFrame(selection);

      figma.ui.postMessage({
        type: "contextUpdate",
        frame: selectedFrame,
      });
    } catch (error) {
      console.error("Error obteniendo contexto:", error);
      this.sendErrorMessage(
        "Error al obtener información del frame seleccionado"
      );
    }
  }

  /**
   * Maneja la generación de diseño
   */
  private static async handleGenerate(msg: GenerateMessage): Promise<void> {
    try {
      // Validar parámetros requeridos
      this.validateGenerateMessage(msg);

      // Mostrar notificación de progreso
      const modelDisplay = this.getModelDisplayName(msg.model);
      figma.notify(`🤖 Generando con ${modelDisplay}...`);
      this.sendSuccessMessage(`Generando diseño con ${modelDisplay}...`);

      // Preparar prompt contextual
      const contextualPrompt = this.buildContextualPrompt(msg);

      // Generar diseño con Gemini
      const geminiService = new GeminiService(msg.apiKey);
      const data = await geminiService.generateDesign(
        contextualPrompt,
        msg.model,
        msg.deviceType as any
      );

      // Debug: Log del JSON generado
      console.log("JSON generado por Gemini:", JSON.stringify(data, null, 2));
      console.log("Dispositivo seleccionado:", msg.deviceType);

      // Crear o actualizar frames
      if (msg.selectedFrame) {
        await FrameManager.updateExistingFrame(
          data.frames,
          msg.selectedFrame.id
        );
      } else {
        await FrameManager.createOrUpdateFrames(data.frames);
      }

      // Notificar éxito
      figma.notify("✅ ¡Diseño generado exitosamente!");
      this.sendSuccessMessage("¡Diseño generado exitosamente!");
    } catch (error) {
      await ErrorHandler.handleError(error, "Error generando diseño");
      const errorMessage = ErrorHandler.getErrorMessage(error);
      figma.notify("⚠️ Error: " + errorMessage);
      this.sendErrorMessage(errorMessage);
    }
  }

  /**
   * Valida el mensaje de generación
   */
  private static validateGenerateMessage(msg: GenerateMessage): void {
    if (!msg.apiKey) {
      throw new Error("API key de Gemini es requerida");
    }
    if (!msg.prompt) {
      throw new Error("Prompt de diseño es requerido");
    }
    if (!msg.deviceType) {
      throw new Error("Tipo de dispositivo es requerido");
    }
  }

  /**
   * Obtiene el nombre de display del modelo
   */
  private static getModelDisplayName(model: string): string {
    return model.replace("gemini-", "Gemini ").replace("-", " ");
  }

  /**
   * Construye el prompt contextual basado en la situación
   */
  private static buildContextualPrompt(msg: GenerateMessage): string {
    let contextualPrompt = msg.prompt;

    if (!msg.selectedFrame) {
      // Modo: crear nuevo diseño
      contextualPrompt = `MODO: Crear nuevo diseño desde cero

${msg.prompt}

INSTRUCCIONES: Crea un diseño completamente nuevo y moderno siguiendo las mejores prácticas de UX/UI.`;
    } else {
      // Modo: editar frame existente
      contextualPrompt = `CONTEXTO: Estoy editando un frame llamado "${msg.selectedFrame.name}" de ${msg.selectedFrame.width}x${msg.selectedFrame.height}px. 

PROMPT DEL USUARIO: ${msg.prompt}

Por favor, adapta el diseño al tamaño existente y mantén coherencia con el nombre del frame.`;
    }

    // Agregar nota de adaptación si aplica
    if (msg.isAdaptation) {
      contextualPrompt += `

NOTA IMPORTANTE: Esta es una ADAPTACIÓN de un diseño existente a un nuevo dispositivo. Crea un frame con nombre similar pero indicando el dispositivo target (ej: "LoginScreen_Desktop", "LoginScreen_Tablet").`;
    }

    // Agregar nota sobre reglas personalizadas
    if (msg.hasCustomRules) {
      contextualPrompt += `

NOTA: El usuario ha definido reglas personalizadas que ya están incluidas en el prompt anterior. Asegúrate de respetarlas.`;
    }

    return contextualPrompt;
  }

  /**
   * Envía mensaje de error a la UI
   */
  static sendErrorMessage(message: string): void {
    this.sendUIMessage("alert", message, "error");
  }

  /**
   * Envía mensaje de éxito a la UI
   */
  static sendSuccessMessage(message: string): void {
    this.sendUIMessage("success", message, "success");
  }

  /**
   * Envía mensaje genérico a la UI
   */
  static sendUIMessage(
    type: string,
    message: string,
    alertType: string = "error"
  ): void {
    figma.ui.postMessage({
      type,
      message,
      alertType,
    } as UIMessage & { type: string });
  }

  /**
   * Envía actualización de contexto a la UI
   */
  static sendContextUpdate(frame: SelectedFrame | null): void {
    figma.ui.postMessage({
      type: "contextUpdate",
      frame: frame,
    });
  }

  /**
   * Cierra la UI
   */
  static closeUI(): void {
    figma.ui.close();
  }

  /**
   * Redimensiona la UI
   */
  static resizeUI(width: number, height: number): void {
    figma.ui.resize(width, height);
  }

  /**
   * Maneja la actualización automática de contexto cuando cambia la selección
   */
  static handleSelectionChange(): void {
    // Opcional: actualizar contexto automáticamente cuando cambie la selección
    figma.on("selectionchange", () => {
      const selection = figma.currentPage.selection;
      const selectedFrame = FrameManager.analyzeSelectedFrame(selection);
      this.sendContextUpdate(selectedFrame);
    });
  }

  /**
   * Envía notificación específica de progreso
   */
  static sendProgressNotification(
    message: string,
    duration: number = 4000
  ): void {
    figma.notify(message);

    // También enviar a la UI para mostrar en la interfaz
    this.sendUIMessage("progress", message, "info");

    // Auto-ocultar después del tiempo especificado
    setTimeout(() => {
      this.sendUIMessage("progress", "", "hidden");
    }, duration);
  }

  /**
   * Maneja errores específicos de la UI
   */
  static async handleUIError(error: unknown, context: string): Promise<void> {
    await ErrorHandler.handleError(error, context);
    const errorMessage = ErrorHandler.getErrorMessage(error);

    // Enviar tanto notificación como mensaje a UI
    figma.notify(`⚠️ ${errorMessage}`);
    this.sendErrorMessage(errorMessage);
  }

  /**
   * Configura handlers adicionales para eventos de Figma
   */
  static setupFigmaEventHandlers(): void {
    // Handler para cambios de selección (opcional)
    // this.handleSelectionChange();

    // Handler para cuando se cierra el plugin
    figma.on("close", () => {
      console.log("Plugin cerrado");
    });
  }

  /**
   * Valida que la UI esté lista para recibir mensajes
   */
  private static isUIReady(): boolean {
    // Verificar si la UI está disponible
    return figma.ui !== null && figma.ui !== undefined;
  }

  /**
   * Envía mensaje de forma segura, verificando que la UI esté lista
   */
  static sendSafeMessage(message: any): void {
    if (this.isUIReady()) {
      figma.ui.postMessage(message);
    } else {
      console.warn("UI no está lista para recibir mensajes:", message);
    }
  }
}
