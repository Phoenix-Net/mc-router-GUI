import { api } from './api.js';
import { DisplayMapping } from './types.js';

class MCRouterGUI {
  private mappings: DisplayMapping[] = [];
  private defaultRoute: string = '';

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadData();
    this.setupEventListeners();
    this.renderMappings();
  }

  private async loadData(): Promise<void> {
    try {
      const mappingsResponse = await api.getMappings();

      if (mappingsResponse.data) {
        this.mappings = mappingsResponse.data;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      this.showNotification('Failed to load data', 'error');
    }
  }

  private setupEventListeners(): void {
    // Add mapping form
    const addMappingForm = document.getElementById('addMappingForm') as HTMLFormElement;
    if (addMappingForm) {
      addMappingForm.addEventListener('submit', this.handleAddMapping.bind(this));
    }

    // Config form - removed since we don't have config management

    // Modal close buttons
    document.querySelectorAll('[data-modal-close]').forEach(button => {
      button.addEventListener('click', (event) => {
        const modalId = (event.target as HTMLElement).getAttribute('data-modal-close');
        if (modalId) this.closeModal(modalId);
      });
    });

    // Add mapping button
    const addMappingBtn = document.getElementById('addMappingBtn');
    if (addMappingBtn) {
      addMappingBtn.addEventListener('click', () => this.openModal('addMappingModal'));
    }

    // Event delegation for mapping actions (edit/delete buttons)
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
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

  private async handleAddMapping(event: Event): Promise<void> {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const hostname = formData.get('hostname') as string;
    const backend = formData.get('backend') as string;
    const isDefault = formData.get('isDefault') === 'on';

    if (!hostname || !backend) {
      this.showNotification('Hostname and backend are required', 'error');
      return;
    }

    const response = await api.addMapping(hostname, backend, isDefault);
    
    if (response.error) {
      this.showNotification(response.error, 'error');
    } else {
      this.showNotification('Mapping added successfully', 'success');
      this.closeModal('addMappingModal');
      form.reset();
      await this.loadData();
      this.renderMappings();
    }
  }

  private async deleteMappingInternal(hostname: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this mapping?')) {
      return;
    }

    const response = await api.deleteMapping(hostname);
    
    if (response.error) {
      this.showNotification(response.error, 'error');
    } else {
      this.showNotification('Mapping deleted successfully', 'success');
      await this.loadData();
      this.renderMappings();
    }
  }

  private renderMappings(): void {
    const container = document.getElementById('mappingsContainer');
    if (!container) return;

    if (this.mappings.length === 0) {
      container.innerHTML = `
        <div class="card text-center py-8">
          <p class="text-gray-500 text-lg">No server mappings configured</p>
          <p class="text-gray-400 mt-2">Click "Add Mapping" to create your first server route</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.mappings.map(mapping => `
      <div class="card">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900">
              ${this.escapeHtml(mapping.hostname)}
              ${mapping.is_default ? '<span class="ml-2 px-2 py-1 bg-minecraft-green text-white text-xs rounded">DEFAULT</span>' : ''}
            </h3>
            <p class="text-gray-600 mt-1">→ ${this.escapeHtml(mapping.backend)}</p>
          </div>
          <div class="flex space-x-2">
            <button 
              data-action="edit" 
              data-mapping-hostname="${this.escapeHtml(mapping.hostname)}" 
              class="btn-secondary text-sm"
            >
              ✏️ Edit
            </button>
            <button 
              data-action="delete" 
              data-mapping-hostname="${this.escapeHtml(mapping.hostname)}" 
              class="btn-danger text-sm"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  private openModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  private closeModal(modalId?: string): void {
    if (modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('hidden');
      }
    } else {
      // Close all modals
      document.querySelectorAll('[id$="Modal"]').forEach(modal => {
        modal.classList.add('hidden');
      });
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public methods for global access
  public async editMapping(hostname: string): Promise<void> {
    const mapping = this.mappings.find(m => m.hostname === hostname);
    if (!mapping) return;

    // For now, just show an alert. You could implement a proper edit modal
    const newHostname = prompt('Enter new hostname:', mapping.hostname);
    const newBackend = prompt('Enter new backend:', mapping.backend);
    
    if (newHostname && newBackend) {
      const response = await api.updateMapping(hostname, newHostname, newBackend, mapping.is_default);
      
      if (response.error) {
        this.showNotification(response.error, 'error');
      } else {
        this.showNotification('Mapping updated successfully', 'success');
        await this.loadData();
        this.renderMappings();
      }
    }
  }

  public async deleteMapping(hostname: string): Promise<void> {
    await this.deleteMappingInternal(hostname);
  }
}

// Initialize the GUI when the page loads
document.addEventListener('DOMContentLoaded', () => {
  (window as any).gui = new MCRouterGUI();
});