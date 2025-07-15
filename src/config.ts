import { DeviceConfig, DeviceType } from "./types";

// Configuraciones de dispositivos
export const DEVICE_CONFIGS: Record<DeviceType, DeviceConfig> = {
  mobile: { width: 375, height: 812, margin: 20 },
  tablet: { width: 768, height: 1024, margin: 40 },
  desktop: { width: 1200, height: 800, margin: 60 },
};

// Configuración de modelos de Gemini
export const GEMINI_MODELS = {
  FLASH: "gemini-1.5-flash",
  PRO: "gemini-1.5-pro",
  FLASH_2: "gemini-2.0-flash",
} as const;

// Endpoint de la API de Gemini
export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Configuración de generación por defecto
export const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.6,
  maxOutputTokens: 8192,
};

// Configuración de reintentos
export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 2000, // 2 segundos
};

// Colores profesionales predefinidos
export const PROFESSIONAL_COLORS = {
  textPrimary: { r: 0.1, g: 0.1, b: 0.1 },
  textSecondary: { r: 0.4, g: 0.4, b: 0.4 },
  textOnDark: { r: 1, g: 1, b: 1 },
  backgroundLight: { r: 0.98, g: 0.98, b: 0.98 },
  buttonPrimary: { r: 0.2, g: 0.6, b: 1 },
  buttonSuccess: { r: 0.2, g: 0.8, b: 0.4 },
  border: { r: 0.8, g: 0.8, b: 0.8 },
  white: { r: 1, g: 1, b: 1 },
} as const;

// Configuración de fuentes
export const FONT_CONFIG = {
  family: "Inter",
  styles: {
    regular: "Regular",
    bold: "Bold",
    medium: "Medium",
    light: "Light",
  },
  defaultSize: 16,
  minSize: 8,
} as const;

// Configuración de sombras por defecto
export const DEFAULT_SHADOW = {
  type: "DROP_SHADOW" as const,
  visible: true,
  blendMode: "NORMAL" as const,
  color: { r: 0, g: 0, b: 0, a: 0.1 },
  offset: { x: 0, y: 2 },
  radius: 4,
  spread: 0,
};

// Configuración de layout por defecto
export const DEFAULT_LAYOUT = {
  padding: 16,
  itemSpacing: 12,
  cornerRadius: 8,
} as const;

// Obtener configuración de dispositivo
export function getDeviceConfig(deviceType: DeviceType): DeviceConfig {
  return DEVICE_CONFIGS[deviceType] || DEVICE_CONFIGS.mobile;
}

// Obtener configuración específica para botones según dispositivo
export function getButtonConfig(deviceType: DeviceType) {
  const config = getDeviceConfig(deviceType);

  switch (deviceType) {
    case "mobile":
      return {
        height: { min: 48, max: 56 },
        maxWidth: config.width - config.margin * 2,
        fontSize: { title: 24, text: 16, small: 14 },
        inputHeight: 48,
      };
    case "tablet":
      return {
        height: { min: 52, max: 60 },
        maxWidth: config.width - config.margin * 2,
        fontSize: { title: 32, text: 18, small: 16 },
        inputHeight: 52,
      };
    case "desktop":
      return {
        height: { min: 56, max: 64 },
        maxWidth: 400, // No todo el ancho en desktop
        fontSize: { title: 36, text: 18, small: 16 },
        inputHeight: 56,
      };
    default:
      return getButtonConfig("mobile");
  }
}
