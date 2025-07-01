/**
 * Role Identity API for LLM Connector
 * Provides endpoints for managing and enhancing role identities
 */

module.exports = function(RED) {
  const path = require('path');
  const fs = require('fs');
  const { createPromptEnhancer } = require('../../shared/prompt-enhancer');
  const dbConfigUtils = require('../../nodes/shared/db-config-utils')(RED);
  
  /**
   * Initialize the role identity API endpoints
   */
  function initRoleApi() {
    // Endpoint to get all roles
    RED.httpAdmin.get('/ai-sombrero/roles', RED.auth.needsPermission('ai-sombrero.read'), async function(req, res) {
      try {
        const dbConfigNodeId = req.query.dbConfig;
        if (!dbConfigNodeId) {
          return res.status(400).json({ error: 'Database config node ID is required' });
        }
        
        const dbConfigNode = dbConfigUtils.getDbConfigNode(dbConfigNodeId);
        if (!dbConfigNode) {
          return res.status(404).json({ error: 'Database config node not found' });
        }
        
        // Get roles from database
        const roles = await getRolesFromDb(dbConfigNodeId);
        res.json(roles);
      } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles: ' + error.message });
      }
    });
    
    // Endpoint to save a role
    RED.httpAdmin.post('/ai-sombrero/roles', RED.auth.needsPermission('ai-sombrero.write'), async function(req, res) {
      try {
        const { role, dbConfig: dbConfigNodeId } = req.body;
        
        if (!role || !dbConfigNodeId) {
          return res.status(400).json({ error: 'Role data and database config node ID are required' });
        }
        
        // Save role to database
        const savedRole = await saveRoleToDb(role, dbConfigNodeId);
        res.json(savedRole);
      } catch (error) {
        console.error('Error saving role:', error);
        res.status(500).json({ error: 'Failed to save role: ' + error.message });
      }
    });
    
    // Endpoint to enhance a role
    RED.httpAdmin.post('/ai-sombrero/enhance-role', RED.auth.needsPermission('ai-sombrero.write'), async function(req, res) {
      try {
        const { name, description, llmConfig: llmConfigNodeId } = req.body;
        
        if (!name || !description || !llmConfigNodeId) {
          return res.status(400).json({ error: 'Role name, description, and LLM config node ID are required' });
        }
        
        const llmConfigNode = RED.nodes.getNode(llmConfigNodeId);
        if (!llmConfigNode) {
          return res.status(404).json({ error: 'LLM config node not found' });
        }
        
        // Enhance role description
        const enhancedDescription = await enhanceRoleDescription(name, description, llmConfigNode);
        res.json({ enhanced: enhancedDescription });
      } catch (error) {
        console.error('Error enhancing role:', error);
        res.status(500).json({ error: 'Failed to enhance role: ' + error.message });
      }
    });
  }
  
  /**
   * Get roles from database
   * @param {string} dbConfigNodeId - Database config node ID
   * @returns {Promise<Array>} - Array of roles
   */
  async function getRolesFromDb(dbConfigNodeId) {
    try {
      const dbConfigNode = dbConfigUtils.getDbConfigNode(dbConfigNodeId);
      
      if (!dbConfigNode) {
        // No database client available, return mock data
        return getMockRoles();
      }
      
      // Ensure roles table exists using the shared utility
      const schema = `
        id ${dbConfigNode.dbType === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
        name ${dbConfigNode.dbType === 'sqlite' ? 'TEXT' : 'VARCHAR(255)'} NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `;
      
      try {
        await dbConfigUtils.createTableIfNotExists(dbConfigNode, 'roles', schema);
      } catch (tableErr) {
        console.error('Error creating roles table:', tableErr);
        // Fall back to mock data if database connection fails
        return getMockRoles();
      }
      
      // Query roles table using the shared utility
      try {
        const query = dbConfigNode.dbType === 'postgresql' ?
          'SELECT id, name, description, created_at, updated_at FROM roles ORDER BY name ASC' :
          'SELECT id, name, description, created_at, updated_at FROM roles ORDER BY name ASC';
        
        const result = await dbConfigUtils.executeQuery(dbConfigNode, query);
        
        if (dbConfigNode.dbType === 'postgresql') {
          return result.rows;
        } else {
          return result;
        }
      } catch (dbError) {
        console.error('Database connection error:', dbError);
        // Fall back to mock data if database connection fails
        return getMockRoles();
      }
    } catch (error) {
      console.error('Database error when fetching roles:', error);
      throw new Error('Database error: ' + error.message);
    }
  }
  
  /**
   * Helper function for mock roles
   * @returns {Array} - Array of mock roles
   */
  function getMockRoles() {
    return [
      { id: '1', name: 'Solutions Architect', description: 'Designs high-level software architecture based on requirements.' },
      { id: '2', name: 'Project Manager', description: 'Oversees project execution, timeline, and resource allocation.' },
      { id: '3', name: 'Developer', description: 'Implements software components based on specifications.' }
    ];
  }
  
  /**
   * Helper function to create a mock role response
   * @param {Object} role - Role object
   * @returns {Object} - Mock role response
   */
  function createMockRole(role) {
    return {
      id: role.id || Math.random().toString(36).substring(2, 15),
      name: role.name,
      description: role.description,
      system_prompt: role.systemPrompt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  /**
   * Save role to database
   * @param {Object} role - Role object
   * @param {string} dbConfigNodeId - Database config node ID
   * @returns {Promise<Object>} - Saved role
   */
  async function saveRoleToDb(role, dbConfigNodeId) {
    try {
      // Get the DB Config node using the shared utility
      const dbConfigNode = dbConfigUtils.getDbConfigNode(dbConfigNodeId);

      // If no DB Config node, use mock data
      if (!dbConfigNode) {
        return createMockRole(role);
      }

      // Ensure the roles table exists using the shared utility
      const schema = `
        id ${dbConfigNode.dbType === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
        name ${dbConfigNode.dbType === 'sqlite' ? 'TEXT' : 'VARCHAR(255)'} NOT NULL,
        description TEXT,
        system_prompt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `;
      
      try {
        await dbConfigUtils.createTableIfNotExists(dbConfigNode, 'roles', schema);
      } catch (tableErr) {
        console.error('Error creating roles table:', tableErr);
        return createMockRole(role);
      }

      // Save the role to the database using the shared utility
      try {
        let result;
        if (role.id) {
          // Update existing role
          const query = dbConfigNode.dbType === 'postgresql' ?
            'UPDATE roles SET name = $1, description = $2, system_prompt = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *' :
            'UPDATE roles SET name = ?, description = ?, system_prompt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
          
          const params = [role.name, role.description, role.systemPrompt, role.id];
          result = await dbConfigUtils.executeQuery(dbConfigNode, query, params);
          
          if (dbConfigNode.dbType === 'postgresql') {
            return result.rows[0];
          } else {
            return { ...role, id: role.id };
          }
        } else {
          // Insert new role
          const query = dbConfigNode.dbType === 'postgresql' ?
            'INSERT INTO roles (name, description, system_prompt) VALUES ($1, $2, $3) RETURNING *' :
            'INSERT INTO roles (name, description, system_prompt) VALUES (?, ?, ?)';
          
          const params = [role.name, role.description, role.systemPrompt];
          result = await dbConfigUtils.executeQuery(dbConfigNode, query, params);
          
          if (dbConfigNode.dbType === 'postgresql') {
            return result.rows[0];
          } else if (dbConfigNode.dbType === 'mysql') {
            return { ...role, id: result.insertId };
          } else if (dbConfigNode.dbType === 'sqlite') {
            return { ...role, id: result.lastID };
          }
        }
      } catch (saveErr) {
        console.error('Error saving role to database:', saveErr);
        return createMockRole(role);
      }
    } catch (err) {
      console.error('Error in saveRoleToDb:', err);
      return createMockRole(role);
    }
  }
  
  /**
   * Enhance role description using LLM
   * @param {string} name - Role name
   * @param {string} description - Role description
   * @param {Object} llmConfigNode - LLM config node
   * @returns {Promise<string>} - Enhanced role description
   */
  async function enhanceRoleDescription(name, description, llmConfigNode) {
    try {
      // Create a prompt enhancer with the LLM config
      const promptEnhancer = createPromptEnhancer({
        llmProvider: async (options) => {
          // This would use the llmConfigNode to call the LLM API
          // For now, we'll use a mock implementation
          
          if (llmConfigNode.callLLM) {
            // If the llmConfigNode has a callLLM method, use it
            return await llmConfigNode.callLLM(options.prompt);
          } else {
            // Mock response for testing
            const roleInstructions = `
            As a ${name}, your responsibilities include:
            
            1. ${description}
            2. Breaking down complex tasks into manageable sub-projects
            3. Providing clear guidance and direction to team members
            4. Ensuring all deliverables meet quality standards
            5. Collaborating effectively with other roles in the workflow
            
            When processing requests, you should:
            - Analyze the requirements thoroughly
            - Consider the broader context and implications
            - Identify potential challenges and solutions
            - Structure your response in a clear, actionable format
            - Provide sufficient detail for implementation
            `;
            
            return { text: roleInstructions };
          }
        },
        context: 'role',
        defaults: {
          temperature: 0.7,
          max_tokens: 500
        }
      });
      
      // Define enhancement instructions for roles
      const enhancementInstructions = 
        `Optimize this role definition to provide clear instructions on how this role should behave when processing requests. ` +
        `Include guidance on breaking tasks into manageable sub-projects and how to collaborate with other roles in the workflow.`;
      
      // Enhance the role description
      const enhancedDescription = await promptEnhancer.enhance(description, enhancementInstructions);
      return enhancedDescription;
    } catch (error) {
      console.error('Error enhancing role description:', error);
      throw new Error('Enhancement error: ' + error.message);
    }
  }
  
  return {
    initRoleApi
  };
};
