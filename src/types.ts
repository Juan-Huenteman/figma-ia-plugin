export interface MCPFrameNode {
  name: string;
  nodes: MCPNode[];
}

export interface MCPNode {
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

export interface UIMessage {
  type: string;
  message: string;
  alertType?: string;
}

export interface GenerateMessage {
  type: "generate";
  prompt: string;
  apiKey: string;
  model: string;
  deviceType: string;
  selectedFrame?: SelectedFrame | null;
  isAdaptation?: boolean;
  hasCustomRules?: boolean;
}

export interface SelectedFrame {
  name: string;
  width: number;
  height: number;
  id: string;
  deviceType?: string;
  styleInfo?: StyleInfo;
}

export interface StyleInfo {
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
}

export interface DeviceConfig {
  width: number;
  height: number;
  margin: number;
}

export interface GeminiResponse {
  frames: MCPFrameNode[];
}

export type DeviceType = "mobile" | "tablet" | "desktop";

export type FontWeight = "normal" | "bold" | "medium" | "light";

export type TextAlign = "LEFT" | "CENTER" | "RIGHT";

export type LayoutMode = "NONE" | "HORIZONTAL" | "VERTICAL";

export type SizingMode = "FIXED" | "AUTO";

export type AlignItems = "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
