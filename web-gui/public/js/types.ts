// Frontend TypeScript types compatible with mc-router API
export interface ServerMapping {
  hostname: string;
  backend: string;
  is_default?: boolean; // We'll track this separately for default route
}

// For display purposes, we'll create this from the API data
export interface DisplayMapping {
  hostname: string;
  backend: string;
  is_default: boolean;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}