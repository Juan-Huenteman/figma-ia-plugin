import { MCPNode, MCPFrameNode, DeviceType, GenerateMessage } from "./types";

export class ValidationService {
  /**
   * Valida un mensaje de generación completo
   */
  static validateGenerateMessage(message: GenerateMessage): ValidationResult {
    const errors: string[] = [];

    // Validar API key
    if (!this.validateApiKey(message.apiKey)) {
      errors.push("API key de Gemini es requerida y debe ser válida");
    }

    // Validar prompt
    if (!this.validatePrompt(message.prompt)) {
      errors.push("El prompt no puede estar vacío");
    }

    // Validar modelo
    if (!this.validateModel(message.model)) {
      errors.push("Modelo de IA inválido");
    }

    // Validar tipo de dispositivo
    if (!this.validateDeviceType(message.deviceType)) {
      errors.push("Tipo de dispositivo inválido");
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Valida API key de Gemini
   */
  static validateApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== "string") {
      return false;
    }

    // API key de Gemini debe tener un formato específico
    // Generalmente empiezan con "AIza" y tienen cierta longitud
    const apiKeyPattern = /^AIza[A-Za-z0-9_-]{35,}$/;
    return apiKeyPattern.test(apiKey.trim());
  }

  /**
   * Valida prompt de usuario
   */
  static validatePrompt(prompt: string): boolean {
    if (!prompt || typeof prompt !== "string") {
      return false;
    }

    const trimmedPrompt = prompt.trim();

    // Debe tener al menos 3 caracteres
    if (trimmedPrompt.length < 3) {
      return false;
    }

    // No debe ser solo espacios o caracteres especiales
    if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/.test(trimmedPrompt)) {
      return false;
    }

    return true;
  }

  /**
   * Valida modelo de IA
   */
  static validateModel(model: string): boolean {
    const validModels = [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-2.0-flash",
    ];

    return validModels.includes(model);
  }

  /**
   * Valida tipo de dispositivo
   */
  static validateDeviceType(deviceType: string): boolean {
    const validDeviceTypes: DeviceType[] = ["mobile", "tablet", "desktop"];
    return validDeviceTypes.includes(deviceType as DeviceType);
  }

  /**
   * Valida estructura de frame MCP
   */
  static validateMCPFrame(frame: MCPFrameNode): ValidationResult {
    const errors: string[] = [];

    // Validar nombre del frame
    if (
      !frame.name ||
      typeof frame.name !== "string" ||
      frame.name.trim().length === 0
    ) {
      errors.push("El frame debe tener un nombre válido");
    }

    // Validar que tenga nodos
    if (!frame.nodes || !Array.isArray(frame.nodes)) {
      errors.push("El frame debe tener un array de nodos válido");
    } else if (frame.nodes.length === 0) {
      errors.push("El frame debe tener al menos un nodo");
    } else {
      // Validar cada nodo
      frame.nodes.forEach((node, index) => {
        const nodeValidation = this.validateMCPNode(node);
        if (!nodeValidation.isValid) {
          errors.push(`Nodo ${index}: ${nodeValidation.errors.join(", ")}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Valida estructura de nodo MCP
   */
  static validateMCPNode(node: MCPNode): ValidationResult {
    const errors: string[] = [];

    // Validar tipo de nodo
    if (!this.validateNodeType(node.type)) {
      errors.push("Tipo de nodo inválido");
    }

    // Validar coordenadas
    if (!this.validateCoordinates(node.x, node.y)) {
      errors.push("Coordenadas x,y deben ser números válidos");
    }

    // Validar dimensiones si están presentes
    if (node.width !== undefined && !this.validateDimension(node.width)) {
      errors.push("Ancho debe ser un número positivo");
    }

    if (node.height !== undefined && !this.validateDimension(node.height)) {
      errors.push("Alto debe ser un número positivo");
    }

    // Validaciones específicas por tipo de nodo
    switch (node.type) {
      case "TEXT":
        const textValidation = this.validateTextNode(node);
        if (!textValidation.isValid) {
          errors.push(...textValidation.errors);
        }
        break;
      case "FRAME":
        const frameValidation = this.validateFrameNode(node);
        if (!frameValidation.isValid) {
          errors.push(...frameValidation.errors);
        }
        break;
    }

    // Validar fills si están presentes
    if (node.fills && !this.validateFills(node.fills)) {
      errors.push("Fills inválidos");
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Valida tipo de nodo
   */
  static validateNodeType(type: string): boolean {
    const validTypes = ["TEXT", "RECTANGLE", "FRAME", "IMAGE"];
    return validTypes.includes(type);
  }

  /**
   * Valida coordenadas
   */
  static validateCoordinates(x: number, y: number): boolean {
    return (
      typeof x === "number" &&
      typeof y === "number" &&
      !isNaN(x) &&
      !isNaN(y) &&
      isFinite(x) &&
      isFinite(y)
    );
  }

  /**
   * Valida dimensión (width o height)
   */
  static validateDimension(dimension: number | string): boolean {
    if (typeof dimension === "string") {
      // Permitir "auto" para dimensiones automáticas
      return dimension === "auto";
    }

    return (
      typeof dimension === "number" &&
      dimension > 0 &&
      !isNaN(dimension) &&
      isFinite(dimension)
    );
  }

  /**
   * Valida nodo de texto específicamente
   */
  static validateTextNode(node: MCPNode): ValidationResult {
    const errors: string[] = [];

    // Debe tener contenido de texto
    const hasText =
      (node.characters && node.characters.trim().length > 0) ||
      (node.text && node.text.trim().length > 0);

    if (!hasText) {
      errors.push("Nodo de texto debe tener contenido (characters o text)");
    }

    // Validar fontSize si está presente
    if (node.fontSize !== undefined) {
      if (
        typeof node.fontSize !== "number" ||
        node.fontSize <= 0 ||
        node.fontSize > 200
      ) {
        errors.push("fontSize debe ser un número entre 1 y 200");
      }
    }

    // Validar textAlign si está presente
    if (node.textAlign !== undefined) {
      const validAlignments = [
        "LEFT",
        "CENTER",
        "RIGHT",
        "left",
        "center",
        "right",
      ];
      if (!validAlignments.includes(node.textAlign)) {
        errors.push("textAlign debe ser LEFT, CENTER o RIGHT");
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Valida nodo de frame específicamente
   */
  static validateFrameNode(node: MCPNode): ValidationResult {
    const errors: string[] = [];

    // Validar layoutMode si está presente
    if (node.layoutMode !== undefined) {
      const validLayouts = ["NONE", "HORIZONTAL", "VERTICAL"];
      if (!validLayouts.includes(node.layoutMode)) {
        errors.push("layoutMode debe ser NONE, HORIZONTAL o VERTICAL");
      }
    }

    // Validar padding si está presente
    if (
      node.paddingTop !== undefined &&
      (typeof node.paddingTop !== "number" || node.paddingTop < 0)
    ) {
      errors.push("paddingTop debe ser un número no negativo");
    }

    // Validar children si están presentes
    const children = (node as any).children || (node as any).nodes;
    if (children && Array.isArray(children)) {
      children.forEach((child: MCPNode, index: number) => {
        const childValidation = this.validateMCPNode(child);
        if (!childValidation.isValid) {
          errors.push(`Child ${index}: ${childValidation.errors.join(", ")}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Valida array de fills
   */
  static validateFills(fills: any[]): boolean {
    if (!Array.isArray(fills)) {
      return false;
    }

    return fills.every((fill) => {
      // Debe tener tipo SOLID
      if (fill.type !== "SOLID") {
        return false;
      }

      // Debe tener color válido
      if (!fill.color || typeof fill.color !== "object") {
        return false;
      }

      // Validar componentes RGB
      const { r, g, b } = fill.color;
      if (
        typeof r !== "number" ||
        typeof g !== "number" ||
        typeof b !== "number"
      ) {
        return false;
      }

      // Los valores deben estar entre 0 y 1
      if (r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1) {
        return false;
      }

      return true;
    });
  }

  /**
   * Valida respuesta completa de Gemini
   */
  static validateGeminiResponse(response: any): ValidationResult {
    const errors: string[] = [];

    // Debe tener estructura básica
    if (!response || typeof response !== "object") {
      errors.push("Respuesta debe ser un objeto válido");
      return { isValid: false, errors };
    }

    // Debe tener array de frames
    if (!response.frames || !Array.isArray(response.frames)) {
      errors.push("Respuesta debe contener un array de frames");
      return { isValid: false, errors };
    }

    // Validar cada frame
    response.frames.forEach((frame: MCPFrameNode, index: number) => {
      const frameValidation = this.validateMCPFrame(frame);
      if (!frameValidation.isValid) {
        errors.push(`Frame ${index}: ${frameValidation.errors.join(", ")}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Sanitiza y normaliza un prompt de usuario
   */
  static sanitizePrompt(prompt: string): string {
    if (!prompt || typeof prompt !== "string") {
      return "";
    }

    return prompt
      .trim()
      .replace(/\s+/g, " ") // Normalizar espacios múltiples
      .replace(/[<>]/g, "") // Remover caracteres problemáticos
      .substring(0, 2000); // Limitar longitud máxima
  }

  /**
   * Sanitiza un API key
   */
  static sanitizeApiKey(apiKey: string): string {
    if (!apiKey || typeof apiKey !== "string") {
      return "";
    }

    return apiKey.trim().replace(/\s/g, ""); // Remover espacios
  }
}

/**
 * Resultado de validación
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
