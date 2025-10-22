class ApiClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // Handle different response types from mc-router API
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                return { data };
            } else {
                return { data: null };
            }
        }
        catch (error) {
            console.error('API request failed:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    // Server mappings - using mc-router API endpoints
    async getMappings() {
        const response = await this.request('/routes');
        if (response.error || !response.data) {
            return { error: response.error || 'Failed to get mappings' };
        }

        // Get default route information
        const defaultRouteResponse = await this.getDefaultRoute();
        const defaultBackend = defaultRouteResponse.data || '';



        // Convert mc-router format to our display format
        const mappings = Object.entries(response.data).map(([hostname, backend]) => ({
            hostname,
            backend,
            is_default: backend === defaultBackend
        }));


        return { data: mappings };
    }
    async addMapping(hostname, backend, isDefault = false) {
        // First add the mapping
        const response = await this.request('/routes', {
            method: 'POST',
            body: JSON.stringify({
                serverAddress: hostname,
                backend: backend
            }),
        });
        // If successful and it's default, set as default route
        if (!response.error && isDefault) {
            const defaultResponse = await this.request('/defaultRoute', {
                method: 'POST',
                body: JSON.stringify({ backend }),
            });

        }
        return response;
    }
    async updateMapping(hostname, newHostname, backend, isDefault = false) {
        // mc-router doesn't have update, so we delete and recreate
        await this.deleteMapping(hostname);
        const response = await this.addMapping(newHostname, backend, isDefault);

        // If we're unsetting this as default (isDefault is false), we might need to clear the default
        if (!isDefault) {
            // Check if this backend was the default and clear it if so
            const defaultRouteResponse = await this.getDefaultRoute();
            if (defaultRouteResponse.data === backend) {
                await this.request('/defaultRoute', {
                    method: 'POST',
                    body: JSON.stringify({ backend: '' }),
                });
            }
        }

        return response;
    }
    async deleteMapping(hostname) {
        return this.request(`/routes/${encodeURIComponent(hostname)}`, {
            method: 'DELETE',
        });
    }
    // Get default route info
    async getDefaultRoute() {
        const response = await this.request('/config');
        if (response.error || !response.data) {
            return { data: '' };
        }
        return { data: response.data.config['default-server'] || '' };
    }

    // Check router status
    async getRouterStatus() {
        return this.request('/status');
    }
}
export const api = new ApiClient();
