/**
 * Prompt Enhancer UI Component
 * 
 * A reusable UI component for enhancing prompts with a dialog interface.
 */

class PromptEnhancerUI {
  /**
   * Create a new PromptEnhancerUI instance
   * @param {Object} options - Configuration options
   * @param {Function} options.onEnhance - Callback when enhancement is applied
   * @param {string} [options.containerId] - ID of the container to append the dialog to
   * @param {Object} [options.styles] - Custom styles for the dialog
   */
  constructor({ onEnhance, containerId = 'red-ui-editor', styles = {} } = {}) {
    if (!onEnhance || typeof onEnhance !== 'function') {
      throw new Error('onEnhance callback is required');
    }
    
    this.onEnhance = onEnhance;
    this.container = document.getElementById(containerId) || document.body;
    this.styles = {
      dialog: {
        display: 'none',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '70%',
        maxHeight: '80vh',
        backgroundColor: '#fff',
        borderRadius: '4px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        zIndex: 1000,
        padding: '20px',
        overflow: 'auto',
        ...(styles.dialog || {})
      },
      overlay: {
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 999,
        ...(styles.overlay || {})
      },
      // Add other style overrides as needed
    };
    
    this.dialog = null;
    this.overlay = null;
    this.originalPrompt = '';
    
    this.initialize();
  }
  
  /**
   * Initialize the UI components
   */
  initialize() {
    // Create overlay
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, this.styles.overlay);
    this.overlay.addEventListener('click', () => this.close());
    
    // Create dialog
    this.dialog = document.createElement('div');
    this.dialog.className = 'prompt-enhancer-dialog';
    Object.assign(this.dialog.style, this.styles.dialog);
    
    // Build dialog content
    this.dialog.innerHTML = `
      <div class="prompt-enhancer-header" style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        <h3 style="margin: 0 0 10px 0;"><i class="fa fa-magic"></i> Enhance Prompt</h3>
      </div>
      
      <div class="prompt-enhancer-body" style="margin-bottom: 15px;">
        <div class="form-row" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            <i class="fa fa-comment"></i> Original Prompt
          </label>
          <textarea id="prompt-enhancer-original" 
            style="width: 100%; height: 100px; resize: vertical;" 
            readonly></textarea>
        </div>
        
        <div class="form-row" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            <i class="fa fa-magic"></i> Enhancement Instructions
          </label>
          <textarea id="prompt-enhancer-instructions" 
            style="width: 100%; height: 80px; resize: vertical;" 
            placeholder="Describe how you'd like to enhance the prompt (e.g., 'Make it more detailed', 'Focus on technical aspects', etc.)"></textarea>
        </div>
        
        <div class="form-row" style="margin-bottom: 15px;">
          <button id="prompt-enhancer-apply" class="editor-button" style="margin-right: 10px;">
            <i class="fa fa-check"></i> Apply Enhancement
          </button>
          <button id="prompt-enhancer-cancel" class="editor-button">
            <i class="fa fa-times"></i> Cancel
          </button>
        </div>
        
        <div class="form-row">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            <i class="fa fa-lightbulb-o"></i> Enhanced Prompt
          </label>
          <textarea id="prompt-enhancer-result" 
            style="width: 100%; height: 150px; resize: vertical;" 
            placeholder="Your enhanced prompt will appear here..."></textarea>
        </div>
      </div>
      
      <div class="prompt-enhancer-footer" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee; text-align: right;">
        <button id="prompt-enhancer-close" class="editor-button">
          <i class="fa fa-times"></i> Close
        </button>
      </div>
    `;
    
    // Add event listeners
    const applyBtn = this.dialog.querySelector('#prompt-enhancer-apply');
    const cancelBtn = this.dialog.querySelector('#prompt-enhancer-cancel');
    const closeBtn = this.dialog.querySelector('#prompt-enhancer-close');
    
    applyBtn.addEventListener('click', () => this.handleApply());
    cancelBtn.addEventListener('click', () => this.close());
    closeBtn.addEventListener('click', () => this.close());
    
    // Append to container
    this.container.appendChild(this.overlay);
    this.container.appendChild(this.dialog);
  }
  
  /**
   * Handle the apply enhancement button click
   */
  handleApply() {
    const instructions = this.dialog.querySelector('#prompt-enhancer-instructions').value.trim();
    const resultTextarea = this.dialog.querySelector('#prompt-enhancer-result');
    
    if (!instructions) {
      alert('Please provide enhancement instructions');
      return;
    }
    
    // Show loading state
    const applyBtn = this.dialog.querySelector('#prompt-enhancer-apply');
    const originalBtnText = applyBtn.innerHTML;
    applyBtn.disabled = true;
    applyBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Enhancing...';
    
    // Call the enhancement callback
    this.onEnhance(this.originalPrompt, instructions)
      .then(enhancedPrompt => {
        resultTextarea.value = enhancedPrompt;
      })
      .catch(error => {
        console.error('Error enhancing prompt:', error);
        alert('Failed to enhance prompt. Please try again.');
      })
      .finally(() => {
        applyBtn.disabled = false;
        applyBtn.innerHTML = originalBtnText;
      });
  }
  
  /**
   * Open the prompt enhancement dialog
   * @param {string} prompt - The original prompt to enhance
   */
  open(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      console.warn('Invalid prompt provided to PromptEnhancerUI.open()');
      return;
    }
    
    this.originalPrompt = prompt;
    
    // Set the original prompt
    const originalTextarea = this.dialog.querySelector('#prompt-enhancer-original');
    const instructionsTextarea = this.dialog.querySelector('#prompt-enhancer-instructions');
    const resultTextarea = this.dialog.querySelector('#prompt-enhancer-result');
    
    originalTextarea.value = prompt;
    instructionsTextarea.value = '';
    resultTextarea.value = '';
    
    // Show the dialog
    this.overlay.style.display = 'block';
    this.dialog.style.display = 'block';
    
    // Focus on the instructions field
    setTimeout(() => {
      instructionsTextarea.focus();
    }, 100);
  }
  
  /**
   * Close the prompt enhancement dialog
   */
  close() {
    this.overlay.style.display = 'none';
    this.dialog.style.display = 'none';
  }
  
  /**
   * Clean up the UI elements
   */
  destroy() {
    if (this.container && this.overlay && this.overlay.parentNode) {
      this.container.removeChild(this.overlay);
    }
    if (this.container && this.dialog && this.dialog.parentNode) {
      this.container.removeChild(this.dialog);
    }
  }
}

// Factory function for creating UI instances
function createPromptEnhancerUI(options) {
  return new PromptEnhancerUI(options);
}

if (typeof RED !== 'undefined') {
  RED.nodes.PromptEnhancerUI = PromptEnhancerUI;
} else if (typeof window !== 'undefined') {
  window.PromptEnhancerUI = PromptEnhancerUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PromptEnhancerUI,
    createPromptEnhancerUI
  };
}
