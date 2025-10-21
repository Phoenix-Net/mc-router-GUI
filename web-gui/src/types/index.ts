export interface ServerMapping {
  id: number;
  hostname: string;
  backend: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConfigSetting {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export interface RouterConfig {
  port: string;
  apiBinding: string;
  debug: boolean;
  connectionRateLimit: number;
  inDocker: boolean;
  mappings: Record<string, string>;
  defaultServer: string | null;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface AddMappingRequest {
  hostname: string;
  backend: string;
  isDefault?: boolean;
}

export interface UpdateConfigRequest {
  value: string;
}