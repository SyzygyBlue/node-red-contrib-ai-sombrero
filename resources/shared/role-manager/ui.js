/**
 * Role Manager UI Component
 * A reusable UI component for managing roles (create, search, select, modify, clone).
 */

class RoleManagerUI {
  constructor({ onSelectRole, dbConfigNodeId, llmConfigNodeId, containerId = 'red-ui-editor', styles = {} } = {}) {
    if (!onSelectRole || typeof onSelectRole !== 'function') {
      throw new Error('onSelectRole callback is required');
    }

    this.onSelectRole = onSelectRole;
    this.dbConfigNodeId = dbConfigNodeId; // Store dbConfigNodeId for later use
    this.llmConfigNodeId = llmConfigNodeId; // Store llmConfigNodeId for prompt enhancement
    this.container = document.getElementById(containerId) || document.body;
    this.styles = {
      dialog: {
        display: 'none',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        maxWidth: '800px',
        maxHeight: '90vh',
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
    };

    this.dialog = null;
    this.overlay = null;
    this.selectedRole = null;

    this.initialize();
  }

  initialize() {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, this.styles.overlay);
    this.overlay.addEventListener('click', () => this.close());

    this.dialog = document.createElement('div');
    this.dialog.className = 'role-manager-dialog';
    Object.assign(this.dialog.style, this.styles.dialog);

    this.dialog.innerHTML = `
      <div class="role-manager-header" style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        <h3 style="margin: 0 0 10px 0;"><i class="fa fa-users"></i> Manage Roles</h3>
      </div>
      
      <div class="role-manager-body" style="margin-bottom: 15px;">
        <div class="form-row" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            <i class="fa fa-search"></i> Search/Select Role
          </label>
          <input type="text" id="role-manager-search" placeholder="Search for roles..." style="width: 100%; padding: 8px; box-sizing: border-box;">
          <div id="role-manager-results" style="max-height: 200px; overflow-y: auto; border: 1px solid #eee; margin-top: 5px;"></div>
        </div>
        
        <div class="form-row" style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            <i class="fa fa-info-circle"></i> Role Details
          </label>
          <input type="text" id="role-manager-name" placeholder="Role Name" style="width: 100%; padding: 8px; box-sizing: border-box; margin-bottom: 5px;">
          <textarea id="role-manager-description" placeholder="Role Description" style="width: 100%; height: 100px; resize: vertical; padding: 8px; box-sizing: border-box;"></textarea>
        </div>

        <div class="form-row" style="margin-bottom: 15px; text-align: right;">
          <button id="role-manager-new" class="editor-button" style="margin-right: 5px;"><i class="fa fa-plus"></i> New</button>
          <button id="role-manager-clone" class="editor-button" style="margin-right: 5px;"><i class="fa fa-copy"></i> Clone</button>
          <button id="role-manager-save" class="editor-button" style="margin-right: 5px;"><i class="fa fa-save"></i> Save</button>
          <button id="role-manager-enhance" class="editor-button" style="margin-right: 5px;"><i class="fa fa-magic"></i> Enhance</button>
          <button id="role-manager-select" class="editor-button"><i class="fa fa-check"></i> Select</button>
        </div>
      </div>
      
      <div class="role-manager-footer" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee; text-align: right;">
        <button id="role-manager-close" class="editor-button">
          <i class="fa fa-times"></i> Close
        </button>
      </div>
    `;

    this.container.appendChild(this.overlay);
    this.container.appendChild(this.dialog);

    this.bindEvents();
  }

  bindEvents() {
    this.dialog.querySelector('#role-manager-close').addEventListener('click', () => this.close());
    this.dialog.querySelector('#role-manager-new').addEventListener('click', () => this.handleNew());
    this.dialog.querySelector('#role-manager-clone').addEventListener('click', () => this.handleClone());
    this.dialog.querySelector('#role-manager-save').addEventListener('click', () => this.handleSave());
    this.dialog.querySelector('#role-manager-enhance').addEventListener('click', () => this.handleEnhance());
    this.dialog.querySelector('#role-manager-select').addEventListener('click', () => this.handleSelect());
    this.dialog.querySelector('#role-manager-search').addEventListener('input', (e) => this.handleSearch(e.target.value));
  }

  handleNew() {
    this.selectedRole = null; // Clear selected role
    this.dialog.querySelector('#role-manager-name').value = '';
    this.dialog.querySelector('#role-manager-description').value = '';
    // Clear any other fields like permissions if they were displayed
  }

  handleClone() {
    if (this.selectedRole) {
      this.selectedRole = { ...this.selectedRole, id: null, name: `${this.selectedRole.name} (Clone)` };
      this.dialog.querySelector('#role-manager-name').value = this.selectedRole.name;
      // ID will be null, so it will be treated as a new role on save
    } else {
      alert('Please select a role to clone.');
    }
  }

  async handleSave() {
    const roleName = this.dialog.querySelector('#role-manager-name').value.trim();
    const roleDescription = this.dialog.querySelector('#role-manager-description').value.trim();
    // For now, permissions will be an empty object, but this can be extended later
    const permissions = {}; 

    if (!roleName) {
      RED.notify('Role name cannot be empty.', 'error');
      return;
    }

    if (!this.dbConfigNodeId) {
      RED.notify('Please select a Database Config node first.', 'error');
      return;
    }

    const roleData = {
      name: roleName,
      description: roleDescription,
      permissions: permissions
    };

    try {
      const endpointBase = '/ai-sombrero/roles';
      let savedRole;
      if (this.selectedRole && this.selectedRole.id) {
        // Update existing role
        const resp = await fetch(`${endpointBase}/${encodeURIComponent(this.selectedRole.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbConfigId: this.dbConfigNodeId, roleData })
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || resp.statusText);
        }
        savedRole = await resp.json();
        RED.notify(`Role '${savedRole.name}' updated successfully.`, 'success');
      } else {
        // Create new role
        const resp = await fetch(endpointBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbConfigId: this.dbConfigNodeId, roleData })
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || resp.statusText);
        }
        savedRole = await resp.json();
        RED.notify(`Role '${savedRole.name}' created successfully.`, 'success');
      }
      this.selectedRole = savedRole; // Update selected role with saved data
      this.displayRole(savedRole); // Refresh display with saved data
      await this.handleSearch(''); // Refresh the role list
    } catch (error) {
      RED.notify(`Error saving role: ${error.message}`, 'error');
    }


    // After saving, refresh search results and potentially select the new/updated role
  }

  async handleEnhance() {
    const roleName = this.dialog.querySelector('#role-manager-name').value.trim();
    if (!roleName) {
      RED.notify('Role name cannot be empty.', 'error');
      return;
    }
    if (!this.llmConfigNodeId) {
      RED.notify('Please select an LLM Config node first.', 'error');
      return;
    }
    const roleDescription = this.dialog.querySelector('#role-manager-description').value.trim() || '';
    const enhanceBtn = this.dialog.querySelector('#role-manager-enhance');
    const originalText = enhanceBtn.innerHTML;
    enhanceBtn.disabled = true;
    enhanceBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Enhancing...';
    try {
      const response = await fetch('/ai-sombrero/enhance-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmConfigId: this.llmConfigNodeId,
          roleName,
          roleDescription,
          instructions: 'Enhance the role description with clear responsibilities, objectives, constraints and guidelines.'
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Enhance failed');
      }
      const data = await response.json();
      this.dialog.querySelector('#role-manager-description').value = data.enhanced || roleDescription;
      RED.notify('Role description enhanced.', 'success');
    } catch (err) {
      RED.notify(`Enhancement failed: ${err.message}`, 'error');
    } finally {
      enhanceBtn.disabled = false;
      enhanceBtn.innerHTML = originalText;
    }
  }

  handleSelect() {
    if (this.selectedRole) {
      this.onSelectRole(this.selectedRole);
      this.close();
    } else {
      alert('Please select a role to use.');
    }
  }

  async handleSearch(query = '') {
    if (!this.dbConfigNodeId) {
      RED.notify('Please select a Database Config node first.', 'error');
      return;
    }
    try {
      const resp = await fetch(`/ai-sombrero/roles?dbConfigId=${encodeURIComponent(this.dbConfigNodeId)}`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || resp.statusText);
      }
      const allRoles = await resp.json();
      const filteredRoles = allRoles.filter(role =>
        role.name.toLowerCase().includes(query.toLowerCase()) ||
        (role.description && role.description.toLowerCase().includes(query.toLowerCase()))
      );
      this.displayRoles(filteredRoles);
    } catch (error) {
      RED.notify(`Error searching roles: ${error.message}`, 'error');
      this.displayRoles([]);
    }
  }

  displayRole(role) {
    this.selectedRole = role;
    this.dialog.querySelector('#role-manager-name').value = role.name;
    this.dialog.querySelector('#role-manager-description').value = role.description;
    // Highlight selected role in results if applicable
  }

  displayRoles(roles) {
    const resultsDiv = this.dialog.querySelector('#role-manager-results');
    resultsDiv.innerHTML = ''; // Clear previous results

    if (roles.length === 0) {
      resultsDiv.innerHTML = '<div style="padding: 8px; color: #888;">No roles found.</div>';
      return;
    }

    roles.forEach(role => {
      const roleItem = document.createElement('div');
      roleItem.className = 'role-manager-result-item'; // Add a class for styling
      roleItem.style.padding = '8px';
      roleItem.style.cursor = 'pointer';
      roleItem.style.borderBottom = '1px solid #eee';
      roleItem.innerHTML = `<strong>${role.name}</strong><br><small>${role.description || 'No description'}</small>`;
      roleItem.addEventListener('click', () => this.displayRole(role));
      resultsDiv.appendChild(roleItem);
    });
  }

  async open() {
    if (!this.dbConfigNodeId) {
      RED.notify('Please select a Database Config node first.', 'error');
      return;
    }
    this.overlay.style.display = 'block';
    this.dialog.style.display = 'block';
    try {
      const roles = await RED.nodes.RoleManager.getAllRoles(this.dbConfigNodeId);
      this.displayRoles(roles);
    } catch (error) {
      RED.notify(`Error loading roles: ${error.message}`, 'error');
      this.displayRoles([]); // Display empty list on error
    }
    this.handleSearch(''); // Show all roles on open
  }

  close() {
    this.overlay.style.display = 'none';
    this.dialog.style.display = 'none';
  }
}

// Export the class for use in Node-RED editor UI
// This will likely be exposed via RED.editor.dialog.open or similar mechanism
if (typeof RED !== 'undefined') {
  RED.nodes.RoleManagerUI = RoleManagerUI;
} else {
  // Fallback for non-Node-RED environments or testing
  window.RoleManagerUI = RoleManagerUI;
}
