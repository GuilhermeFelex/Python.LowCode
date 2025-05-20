import type { LucideProps } from 'lucide-react';
import type React from 'react';

export interface ParameterDefinition {
  id: string;
  name: string; // Changed from label to name for consistency
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'password'; // Add more types as needed
  defaultValue: string;
  placeholder?: string;
  options?: { value: string; label: string }[]; // For select type
  condition?: { paramId: string; paramValue: string | string[] }; // For conditional display, paramValue can be a string or an array of strings
}

export interface Block {
  id:string;
  name: string;
  description?: string;
  icon: React.FC<LucideProps>;
  parameters: ParameterDefinition[];
  codeTemplate: (params: Record<string, string>) => string;
  category: string; // e.g., "IO", "Logic", "Data"
  canHaveChildren?: boolean; // New property
}

export interface CanvasBlock {
  instanceId: string;
  blockTypeId: string;
  params: Record<string, string>;
  children?: CanvasBlock[]; // New property for nested blocks
  isCollapsed?: boolean; // New property for collapse state
  // Add x, y coordinates if implementing free-form canvas
}
