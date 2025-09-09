/**
 * Modal utilities for creating reusable modal dialogs
 */
class ModalUtils {
    static activeModal = null;
    
    /**
     * Create and show a modal dialog
     * @param {Object} options - Modal configuration
     * @param {string} options.id - Modal ID
     * @param {string} options.title - Modal title
     * @param {string} options.content - Modal HTML content
     * @param {string} options.size - Modal size ('small', 'medium', 'large', 'fullscreen')
     * @param {boolean} options.closable - Whether modal can be closed
     * @param {Function} options.onClose - Callback when modal is closed
     */
    static showModal(options) {
        const {
            id = 'modal',
            title = 'Details',
            content = '',
            size = 'large',
            closable = true,
            onClose = null
        } = options;
        
        // Remove any existing modal
        this.hideModal();
        
        // Create modal HTML
        const modalHtml = `
            <div id="${id}" class="modal-overlay" onclick="ModalUtils.handleOverlayClick(event, '${id}', ${closable})">
                <div class="modal-dialog modal-${size}" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2 class="modal-title">${title}</h2>
                        ${closable ? `<button class="modal-close" onclick="ModalUtils.hideModal('${id}')">&times;</button>` : ''}
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Store reference
        this.activeModal = {
            id: id,
            onClose: onClose
        };
        
        // Add escape key listener
        if (closable) {
            document.addEventListener('keydown', this.handleKeyDown);
        }
        
        // Focus trap
        this.trapFocus(id);
        
        return id;
    }
    
    /**
     * Hide the active modal
     * @param {string} modalId - Optional modal ID to hide
     */
    static hideModal(modalId = null) {
        const id = modalId || (this.activeModal ? this.activeModal.id : null);
        if (!id) return;
        
        const modal = document.getElementById(id);
        if (modal) {
            // Call onClose callback if exists
            if (this.activeModal && this.activeModal.onClose) {
                this.activeModal.onClose();
            }
            
            modal.remove();
            this.activeModal = null;
            
            // Remove event listeners
            document.removeEventListener('keydown', this.handleKeyDown);
        }
    }
    
    /**
     * Handle overlay click (close modal if clicking outside content)
     */
    static handleOverlayClick(event, modalId, closable) {
        if (closable && event.target.classList.contains('modal-overlay')) {
            this.hideModal(modalId);
        }
    }
    
    /**
     * Handle keyboard events
     */
    static handleKeyDown = (event) => {
        if (event.key === 'Escape' && this.activeModal) {
            this.hideModal();
        }
    }
    
    /**
     * Create tab-based content for modals
     * @param {Array} tabs - Array of tab objects {id, label, content, active}
     * @returns {string} HTML for tabbed content
     */
    static createTabbedContent(tabs) {
        const tabHeaders = tabs.map(tab => 
            `<button class="tab-button ${tab.active ? 'active' : ''}" onclick="ModalUtils.switchTab('${tab.id}')">${tab.label}</button>`
        ).join('');
        
        const tabContents = tabs.map(tab => 
            `<div id="${tab.id}" class="tab-content ${tab.active ? 'active' : ''}">${tab.content}</div>`
        ).join('');
        
        return `
            <div class="tab-container">
                <div class="tab-header">
                    ${tabHeaders}
                </div>
                <div class="tab-body">
                    ${tabContents}
                </div>
            </div>
        `;
    }
    
    /**
     * Switch active tab
     * @param {string} tabId - Tab ID to activate
     */
    static switchTab(tabId) {
        // Remove active from all tabs
        document.querySelectorAll('.tab-button, .tab-content').forEach(el => {
            el.classList.remove('active');
        });
        
        // Activate selected tab
        const button = document.querySelector(`.tab-button[onclick*="${tabId}"]`);
        const content = document.getElementById(tabId);
        
        if (button) button.classList.add('active');
        if (content) content.classList.add('active');
    }
    
    /**
     * Simple focus trap for accessibility
     */
    static trapFocus(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
}

// Make available globally
window.ModalUtils = ModalUtils;