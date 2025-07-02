/**
 * Role Manager CRUD Utility
 * This file will contain the CRUD operations for the roles table.
 */

// Role Manager CRUD utilities

module.exports = function(RED) {

  async function getDbClient(dbConfigNodeId) {
    const dbConfigNode = RED.nodes.getNode(dbConfigNodeId);
    if (!dbConfigNode) {
      throw new Error(`Database config node with ID ${dbConfigNodeId} not found.`);
    }
    return await dbConfigNode.getClient();
  }

  const RoleManager = {
    /**
     * Retrieves all roles from the database.
     * @param {string} dbConfigNodeId - The ID of the dbconfig-node to use.
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of role objects.
     */
    getAllRoles: async function(dbConfigNodeId) {
      let client;
      try {
        client = await getDbClient(dbConfigNodeId);
        // Assuming PostgreSQL for now. Adjust query for other DB types if necessary.
        const result = await client.query('SELECT id, name, description, permissions FROM roles');
        return result.rows;
      } catch (error) {
        RED.log.error(`[RoleManager] Failed to get all roles: ${error.message}`);
        throw error;
      } finally {
        // For PostgreSQL pool, no need to release client explicitly after query
        // For single connection clients (like mysql2/promise.createConnection), client.release() might be needed
      }
    },

    /**
     * Creates a new role in the database.
     * @param {string} dbConfigNodeId - The ID of the dbconfig-node to use.
     * @param {Object} roleData - The role data (name, description, permissions).
     * @returns {Promise<Object>} A promise that resolves to the created role object.
     */
    createRole: async function(dbConfigNodeId, roleData) {
      let client;
      try {
        client = await getDbClient(dbConfigNodeId);
        const { name, description, permissions } = roleData;
        if (!name) {
          throw new Error('Role name is required.');
        }
        const query = 'INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3) RETURNING id, name, description, permissions';
        const values = [name, description || null, permissions ? JSON.stringify(permissions) : null];
        const result = await client.query(query, values);
        return result.rows[0];
      } catch (error) {
        RED.log.error(`[RoleManager] Failed to create role: ${error.message}`);
        throw error;
      }
    },

    /**
     * Retrieves a single role by its ID.
     * @param {string} dbConfigNodeId - The ID of the dbconfig-node to use.
     * @param {string} roleId - The ID of the role to retrieve.
     * @returns {Promise<Object|null>} A promise that resolves to the role object or null if not found.
     */
    getRole: async function(dbConfigNodeId, roleId) {
      let client;
      try {
        client = await getDbClient(dbConfigNodeId);
        const query = 'SELECT id, name, description, permissions FROM roles WHERE id = $1';
        const result = await client.query(query, [roleId]);
        return result.rows[0] || null;
      } catch (error) {
        RED.log.error(`[RoleManager] Failed to get role by ID (${roleId}): ${error.message}`);
        throw error;
      }
    },

    /**
     * Updates an existing role in the database.
     * @param {string} dbConfigNodeId - The ID of the dbconfig-node to use.
     * @param {string} roleId - The ID of the role to update.
     * @param {Object} updatedRoleData - The updated role data (name, description, permissions).
     * @returns {Promise<Object|null>} A promise that resolves to the updated role object or null if not found.
     */
    updateRole: async function(dbConfigNodeId, roleId, updatedRoleData) {
      let client;
      try {
        client = await getDbClient(dbConfigNodeId);
        const { name, description, permissions } = updatedRoleData;
        
        const updates = [];
        const values = [roleId];
        let paramIndex = 2;

        if (name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(name);
        }
        if (description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          values.push(description);
        }
        if (permissions !== undefined) {
          updates.push(`permissions = $${paramIndex++}`);
          values.push(permissions ? JSON.stringify(permissions) : null);
        }

        if (updates.length === 0) {
          return this.getRole(dbConfigNodeId, roleId); // No updates provided
        }

        const query = `UPDATE roles SET ${updates.join(', ')} WHERE id = $1 RETURNING id, name, description, permissions`;
        const result = await client.query(query, values);
        return result.rows[0] || null;
      } catch (error) {
        RED.log.error(`[RoleManager] Failed to update role (${roleId}): ${error.message}`);
        throw error;
      }
    },

    /**
     * Deletes a role from the database.
     * @param {string} dbConfigNodeId - The ID of the dbconfig-node to use.
     * @param {string} roleId - The ID of the role to delete.
     * @returns {Promise<boolean>} A promise that resolves to true if the role was deleted, false otherwise.
     */
    deleteRole: async function(dbConfigNodeId, roleId) {
      let client;
      try {
        client = await getDbClient(dbConfigNodeId);
        const query = 'DELETE FROM roles WHERE id = $1 RETURNING id';
        const result = await client.query(query, [roleId]);
        return result.rowCount > 0;
      } catch (error) {
        RED.log.error(`[RoleManager] Failed to delete role (${roleId}): ${error.message}`);
        throw error;
      }
    }
  };

  // Expose the RoleManager functions globally or via RED.nodes for other nodes to use
  // This makes it accessible from other parts of the Node-RED runtime.
  RED.nodes.RoleManager = RoleManager;

  // CRUD HTTP Admin endpoints for roles
  // Get all roles
  RED.httpAdmin.get('/ai-sombrero/roles', RED.auth.needsPermission('llm-connector.read'), async function(req, res) {
    try {
      const { dbConfigId } = req.query || {};
      if (!dbConfigId) {
        throw new Error('Parameter dbConfigId is required');
      }
      const roles = await RoleManager.getAllRoles(dbConfigId);
      res.json(roles);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create role
  RED.httpAdmin.post('/ai-sombrero/roles', RED.auth.needsPermission('llm-connector.write'), async function(req, res) {
    try {
      const { dbConfigId, roleData } = req.body || {};
      if (!dbConfigId || !roleData) {
        throw new Error('Parameters dbConfigId and roleData are required');
      }
      const role = await RoleManager.createRole(dbConfigId, roleData);
      res.json(role);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update role
  RED.httpAdmin.put('/ai-sombrero/roles/:id', RED.auth.needsPermission('llm-connector.write'), async function(req, res) {
    try {
      const { dbConfigId, roleData } = req.body || {};
      const roleId = req.params.id;
      if (!dbConfigId || !roleData) {
        throw new Error('Parameters dbConfigId and roleData are required');
      }
      const role = await RoleManager.updateRole(dbConfigId, roleId, roleData);
      res.json(role);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete role
  RED.httpAdmin.delete('/ai-sombrero/roles/:id', RED.auth.needsPermission('llm-connector.write'), async function(req, res) {
    try {
      const { dbConfigId } = req.query || {};
      const roleId = req.params.id;
      if (!dbConfigId) {
        throw new Error('Parameter dbConfigId is required');
      }
      const deleted = await RoleManager.deleteRole(dbConfigId, roleId);
      res.json({ deleted });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // HTTP Admin endpoint to enhance role descriptions using selected LLM Config
  RED.httpAdmin.post('/ai-sombrero/enhance-role', RED.auth.needsPermission('llm-connector.read'), async function(req, res) {
    try {
      const { llmConfigId, roleName, roleDescription, instructions } = req.body || {};
      if (!llmConfigId) {
        throw new Error('Parameter llmConfigId is required');
      }
      const llmConfigNode = RED.nodes.getNode(llmConfigId);
      if (!llmConfigNode || typeof llmConfigNode.callLLM !== 'function') {
        throw new Error(`LLM Config node ${llmConfigId} not found or does not support callLLM`);
      }
      const prompt = `You are an expert AI system designer tasked with writing clear, actionable role descriptions for downstream AI orchestration.\n\nRole name: ${roleName}\n\nCurrent description:\n${roleDescription || '(none provided)'}\n\n${instructions || ''}\n\nProvide an enhanced role description with:\n• Responsibilities\n• Objectives\n• Constraints\n• Guidelines\n\nEnhanced role description:`;
      const llmResp = await llmConfigNode.callLLM({
        prompt,
        max_tokens: 500,
        temperature: 0.7
      });
      const enhanced = llmResp.text || llmResp.choices?.[0]?.text || '';
      res.json({ enhanced: enhanced.trim() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
