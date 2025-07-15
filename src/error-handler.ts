export class ErrorHandler {
  /**
   * Maneja errores de forma centralizada
   */
  static async handleError(
    error: unknown,
    context: string = "Error desconocido"
  ): Promise<void> {
    console.error(`${context}:`, error);

    // Registrar error para debugging
    this.logError(error, context);

    // Notificar error específico si es necesario
    this.notifySpecificError(error, context);
  }

  /**
   * Obtiene mensaje de error amigable para el usuario
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return this.parseErrorMessage(error.message);
    }

    if (typeof error === "string") {
      return this.parseErrorMessage(error);
    }

    return "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.";
  }

  /**
   * Parsea el mensaje de error para hacer más amigable al usuario
   */
  private static parseErrorMessage(message: string): string {
    // Errores de API de Gemini
    if (message.includes("API key")) {
      return "API key inválida. Verifica tu clave de Gemini.";
    }

    if (message.includes("403") || message.includes("Forbidden")) {
      return "Acceso denegado. Verifica los permisos de tu API key.";
    }

    if (message.includes("429") || message.includes("quota")) {
      return "Límite de cuota excedido. Intenta más tarde o verifica tu plan.";
    }

    if (message.includes("503") || message.includes("sobrecarga")) {
      return "Servicio temporalmente saturado. Reintentando automáticamente...";
    }

    if (message.includes("JSON truncado")) {
      return "Respuesta incompleta del servidor. Intenta con un prompt más simple.";
    }

    if (message.includes("parsing error") || message.includes("parsear")) {
      return "Error procesando la respuesta. El servidor devolvió datos malformados.";
    }

    // Errores de conexión de red
    if (message.includes("network") || message.includes("fetch")) {
      return "Error de conexión. Verifica tu conexión a internet.";
    }

    if (message.includes("timeout")) {
      return "Tiempo de espera agotado. Intenta de nuevo.";
    }

    // Errores de validación
    if (message.includes("requerida") || message.includes("required")) {
      return message; // Estos ya son amigables
    }

    // Errores de frame/nodos
    if (message.includes("Frame no encontrado")) {
      return "El frame seleccionado ya no existe. Selecciona otro frame.";
    }

    if (message.includes("fuente") || message.includes("font")) {
      return "Error cargando fuentes. Usando fuente por defecto.";
    }

    // Errores de Figma
    if (message.includes("figma") || message.includes("plugin")) {
      return "Error interno del plugin. Reinicia e intenta de nuevo.";
    }

    // Si no coincide con ningún patrón conocido, devolver el mensaje original
    // pero limpiarlo un poco
    return this.sanitizeErrorMessage(message);
  }

  /**
   * Limpia y sanitiza el mensaje de error
   */
  private static sanitizeErrorMessage(message: string): string {
    // Remover información técnica muy específica
    let cleanMessage = message
      .replace(/Error:\s*/gi, "")
      .replace(/TypeError:\s*/gi, "")
      .replace(/ReferenceError:\s*/gi, "")
      .replace(/at.*?\n/g, "") // Remover stack traces
      .replace(/\s+/g, " ") // Normalizar espacios
      .trim();

    // Capitalizar primera letra
    if (cleanMessage.length > 0) {
      cleanMessage =
        cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);
    }

    // Asegurar que termine con punto
    if (cleanMessage.length > 0 && !cleanMessage.endsWith(".")) {
      cleanMessage += ".";
    }

    return cleanMessage || "Error inesperado.";
  }

  /**
   * Registra el error para debugging
   */
  private static logError(error: unknown, context: string): void {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    };

    // En un entorno de producción, aquí podrías enviar a un servicio de logging
    console.error("[ERROR_LOG]", JSON.stringify(errorInfo, null, 2));
  }

  /**
   * Notifica errores específicos que requieren acción inmediata
   */
  private static notifySpecificError(error: unknown, context: string): void {
    if (error instanceof Error) {
      // Errores críticos que requieren notificación inmediata
      if (
        error.message.includes("API key") ||
        error.message.includes("403") ||
        error.message.includes("401")
      ) {
        // No hacer nada aquí, se maneja en el UI manager
        return;
      }

      // Errores de límite de cuota
      if (error.message.includes("429") || error.message.includes("quota")) {
        // Podríamos implementar lógica de rate limiting aquí
        return;
      }
    }
  }

  /**
   * Verifica si un error es recuperable (puede reintentarse)
   */
  static isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Errores temporales que pueden reintentarse
      if (
        message.includes("503") ||
        message.includes("timeout") ||
        message.includes("network") ||
        message.includes("sobrecarga")
      ) {
        return true;
      }

      // Errores permanentes que no deben reintentarse
      if (
        message.includes("api key") ||
        message.includes("403") ||
        message.includes("401") ||
        message.includes("400")
      ) {
        return false;
      }
    }

    // Por defecto, considerar que puede reintentarse
    return true;
  }

  /**
   * Obtiene sugerencias de resolución para el error
   */
  static getErrorSuggestions(error: unknown): string[] {
    const suggestions: string[] = [];

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes("api key")) {
        suggestions.push("Verifica que tu API key de Gemini esté correcta");
        suggestions.push("Asegúrate de que la API key tenga permisos válidos");
        suggestions.push("Obtén una nueva API key en Google AI Studio");
      }

      if (message.includes("quota") || message.includes("429")) {
        suggestions.push("Espera unos minutos antes de volver a intentar");
        suggestions.push("Verifica tu límite de cuota en Google AI Studio");
        suggestions.push("Considera actualizar tu plan si es necesario");
      }

      if (message.includes("network") || message.includes("timeout")) {
        suggestions.push("Verifica tu conexión a internet");
        suggestions.push("Intenta de nuevo en unos momentos");
        suggestions.push("Verifica que no haya bloqueos de firewall");
      }

      if (message.includes("json") || message.includes("parsing")) {
        suggestions.push("Intenta con un prompt más simple");
        suggestions.push("Reduce la complejidad de tu solicitud");
        suggestions.push("Verifica que el modelo seleccionado esté disponible");
      }

      if (message.includes("frame")) {
        suggestions.push("Asegúrate de tener un frame seleccionado");
        suggestions.push("Verifica que el frame seleccionado sea válido");
        suggestions.push("Intenta crear un nuevo frame");
      }
    }

    // Sugerencias generales si no hay específicas
    if (suggestions.length === 0) {
      suggestions.push("Intenta de nuevo en unos momentos");
      suggestions.push("Verifica tu configuración y conexión");
      suggestions.push("Reinicia el plugin si el problema persiste");
    }

    return suggestions;
  }

  /**
   * Formatea un error completo con mensaje y sugerencias
   */
  static formatCompleteError(error: unknown, context: string = ""): string {
    const message = this.getErrorMessage(error);
    const suggestions = this.getErrorSuggestions(error);

    let formattedError = message;

    if (suggestions.length > 0) {
      formattedError += "\n\nSugerencias:\n";
      formattedError += suggestions.map((s) => `• ${s}`).join("\n");
    }

    if (context) {
      formattedError = `${context}: ${formattedError}`;
    }

    return formattedError;
  }

  /**
   * Maneja errores asincrónicos no capturados
   */
  static handleUnhandledError(): void {
    // En el contexto de Figma plugin, window no está disponible
    // Los errores no capturados se manejan a través de try/catch en cada operación
    console.log("Error handler configurado para contexto de Figma plugin");
  }
}
