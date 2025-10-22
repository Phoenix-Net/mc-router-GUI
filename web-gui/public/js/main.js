import { api } from './api.js';
class MCRouterGUI {
    constructor() {
        this.mappings = [];
        this.defaultRoute = '';
        this.routerStatus = 'offline';
        this.statusCheckInterval = null;
        this.init();
    }
    async init() {
        this.initializeTheme();
        await this.loadData();
        this.setupEventListeners();
        this.renderMappings();
        this.startStatusChecking();
    }
    async loadData() {
        try {
            const mappingsResponse = await api.getMappings();
            if (mappingsResponse.data) {
                this.mappings = mappingsResponse.data;

            }
        }
        catch (error) {
            console.error('Failed to load data:', error);
            this.showNotification('Failed to load data', 'error');
        }
    }
    setupEventListeners() {
        // Add mapping form
        const addMappingForm = document.getElementById('addMappingForm');
        if (addMappingForm) {
            addMappingForm.addEventListener('submit', this.handleAddMapping.bind(this));
        }

        // Edit mapping form
        const editMappingForm = document.getElementById('editMappingForm');
        if (editMappingForm) {
            editMappingForm.addEventListener('submit', this.handleEditMapping.bind(this));
        }

        // Modal close buttons
        document.querySelectorAll('[data-modal-close]').forEach(button => {
            button.addEventListener('click', (event) => {
                const modalId = event.target.getAttribute('data-modal-close');
                if (modalId)
                    this.closeModal(modalId);
            });
        });
        // Add mapping button
        const addMappingBtn = document.getElementById('addMappingBtn');
        if (addMappingBtn) {
            addMappingBtn.addEventListener('click', () => this.openModal('addMappingModal'));
        }
        // Theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.loadData();
                this.renderMappings();
                await this.checkRouterStatus();
                this.showNotification('Data refreshed', 'success');
            });
        }
        // Event delegation for mapping actions (edit/delete buttons)
        document.addEventListener('click', (event) => {
            const target = event.target;
            const action = target.getAttribute('data-action');
            const mappingHostname = target.getAttribute('data-mapping-hostname');

            if (action && mappingHostname) {
                if (action === 'edit') {
                    this.editMapping(mappingHostname);
                } else if (action === 'delete') {
                    this.deleteMapping(mappingHostname);
                }
            }
        });
    }
    async handleAddMapping(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const hostname = formData.get('hostname');
        const backend = formData.get('backend');
        const isDefault = formData.get('isDefault') === 'on';
        if (!hostname || !backend) {
            this.showNotification('Hostname and backend are required', 'error');
            return;
        }
        const response = await api.addMapping(hostname, backend, isDefault);
        if (response.error) {
            this.showNotification(response.error, 'error');
        }
        else {
            this.showNotification('Mapping added successfully', 'success');
            this.closeModal('addMappingModal');
            form.reset();
            await this.loadData();
            this.renderMappings();
        }
    }

    async handleEditMapping(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const originalHostname = formData.get('originalHostname');
        const hostname = formData.get('hostname');
        const backend = formData.get('backend');
        const isDefault = formData.get('isDefault') === 'on';

        if (!hostname || !backend) {
            this.showNotification('Hostname and backend are required', 'error');
            return;
        }

        const response = await api.updateMapping(originalHostname, hostname, backend, isDefault);
        if (response.error) {
            this.showNotification(response.error, 'error');
        } else {
            this.showNotification('Mapping updated successfully', 'success');
            this.closeModal('editMappingModal');
            form.reset();
            await this.loadData();
            this.renderMappings();
        }
    }

    async deleteMappingInternal(hostname) {
        if (!confirm('Are you sure you want to delete this mapping?')) {
            return;
        }
        const response = await api.deleteMapping(hostname);
        if (response.error) {
            this.showNotification(response.error, 'error');
        }
        else {
            this.showNotification('Mapping deleted successfully', 'success');
            await this.loadData();
            this.renderMappings();
        }
    }
    renderMappings() {
        const container = document.getElementById('mappingsContainer');
        if (!container)
            return;

        if (this.mappings.length === 0) {
            container.innerHTML = `
                <div class="card text-center py-8">
                    <p class="text-gray-500 dark:text-gray-400 text-lg">No server mappings configured</p>
                    <p class="text-gray-400 dark:text-gray-500 mt-2">Click "Add Mapping" to create your first server route</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.mappings.map(mapping => `
      <div class="card">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              ${this.escapeHtml(mapping.hostname)}
              ${mapping.is_default ? '<span class="ml-2 px-2 py-1 bg-minecraft-green text-white text-xs rounded">DEFAULT</span>' : ''}
            </h3>
            <p class="text-gray-600 dark:text-gray-300 mt-1">→ ${this.escapeHtml(mapping.backend)}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Created: ${new Date(mapping.created_at || Date.now()).toLocaleDateString()}
            </p>
          </div>
          <div class="flex space-x-2">
            <button 
              data-action="edit" 
              data-mapping-hostname="${this.escapeHtml(mapping.hostname)}" 
              class="btn-secondary text-sm"
            >
              Edit
            </button>
            <button 
              data-action="delete" 
              data-mapping-hostname="${this.escapeHtml(mapping.hostname)}" 
              class="btn-danger text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    closeModal(modalId) {
        if (modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
            }
        }
        else {
            // Close all modals
            document.querySelectorAll('[id$="Modal"]').forEach(modal => {
                modal.classList.add('hidden');
            });
        }
    }
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    toggleTheme() {
        const html = document.documentElement;
        const themeIcon = document.getElementById('themeIcon');
        if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            if (themeIcon) {
                themeIcon.className = 'mdi mdi-moon-waning-crescent text-base';
            }
            localStorage.setItem('theme', 'light');
        } else {
            html.classList.add('dark');
            if (themeIcon) {
                themeIcon.className = 'mdi mdi-white-balance-sunny text-base';
            }
            localStorage.setItem('theme', 'dark');
        }
    }
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        const html = document.documentElement;
        const themeIcon = document.getElementById('themeIcon');

        // Default to dark mode
        if (savedTheme === 'light') {
            html.classList.remove('dark');
            if (themeIcon) {
                themeIcon.className = 'mdi mdi-moon-waning-crescent text-base';
            }
        } else {
            html.classList.add('dark');
            if (themeIcon) {
                themeIcon.className = 'mdi mdi-white-balance-sunny text-base';
            }
            localStorage.setItem('theme', 'dark');
        }
    }
    // Public methods for global access
    async editMapping(hostname) {
        const mapping = this.mappings.find(m => m.hostname === hostname);
        if (!mapping) return;

        // Populate the edit form with current values
        const form = document.getElementById('editMappingForm');
        if (!form) return;

        form.querySelector('input[name="originalHostname"]').value = hostname;
        form.querySelector('input[name="hostname"]').value = mapping.hostname;
        form.querySelector('input[name="backend"]').value = mapping.backend;
        form.querySelector('input[name="isDefault"]').checked = mapping.is_default || false;

        // Show the edit modal
        this.openModal('editMappingModal');
    }
    async deleteMapping(hostname) {
        await this.deleteMappingInternal(hostname);
    }

    async checkRouterStatus() {
        try {
            const response = await api.getRouterStatus();
            if (response.data && response.data.status) {
                this.updateRouterStatus(response.data.status);
            } else {
                this.updateRouterStatus('offline');
            }
        } catch (error) {
            console.error('Failed to check router status:', error);
            this.updateRouterStatus('offline');
        }
    }

    updateRouterStatus(status) {
        if (this.routerStatus === status) return; // No change

        this.routerStatus = status;

        // Update status indicator
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const favicon = document.getElementById('favicon');

        if (statusIndicator && statusText) {
            if (status === 'active') {
                statusIndicator.className = 'w-3 h-3 bg-green-500 rounded-full mr-2';
                statusText.textContent = 'Router Status: Active';
            } else {
                statusIndicator.className = 'w-3 h-3 bg-red-500 rounded-full mr-2';
                statusText.textContent = 'Router Status: Offline';
            }
        }

        // Update favicon
        if (favicon) {
            const color = status === 'active' ? '00AA00' : 'FF0000';
            favicon.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='80' height='80' x='10' y='10' rx='8' fill='%23${color}'/></svg>`;
        }
    }

    startStatusChecking() {
        // Check status immediately
        this.checkRouterStatus();

        // Then check every 5 seconds
        this.statusCheckInterval = setInterval(() => {
            this.checkRouterStatus();
        }, 5000);
    }

    stopStatusChecking() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }
}
// Initialize the GUI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.gui = new MCRouterGUI();
});
