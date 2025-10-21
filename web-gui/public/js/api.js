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
        // Convert mc-router format to our display format
        const mappings = Object.entries(response.data).map(([hostname, backend]) => ({
            hostname,
            backend,
            is_default: false // We'll determine this separately
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
            await this.request('/defaultRoute', {
                method: 'POST',
                body: JSON.stringify({ backend }),
            });
        }
        return response;
    }
    async updateMapping(hostname, newHostname, backend, isDefault = false) {
        // mc-router doesn't have update, so we delete and recreate
        await this.deleteMapping(hostname);
        return this.addMapping(newHostname, backend, isDefault);
    }
    async deleteMapping(hostname) {
        return this.request(`/routes/${encodeURIComponent(hostname)}`, {
            method: 'DELETE',
        });
    }
    // Get default route info
    async getDefaultRoute() {
        // mc-router doesn't expose this directly, we'll track it in the UI
        return { data: '' };
    }
}
export const api = new ApiClient();
