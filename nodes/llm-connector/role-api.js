/**
 * Role Identity API for LLM Connector
 * Provides endpoints for managing and enhancing role identities
 */

module.exports = function(RED) {
  const { createPromptEnhancer } = require('../../shared/prompt-enhancer');
  
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
        
        const dbConfigNode = RED.nodes.getNode(dbConfigNodeId);
        if (!dbConfigNode) {
          return res.status(404).json({ error: 'Database config node not found' });
        }
        
        // Get roles from database
        const roles = await getRolesFromDb(dbConfigNode);
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
        
        const dbConfigNode = RED.nodes.getNode(dbConfigNodeId);
        if (!dbConfigNode) {
          return res.status(404).json({ error: 'Database config node not found' });
        }
        
        // Save role to database
        const savedRole = await saveRoleToDb(role, dbConfigNode);
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
   * @param {Object} dbConfigNode - Database config node
   * @returns {Promise<Array>} - Array of roles
   */
  async function getRolesFromDb(dbConfigNode) {
    // This is a placeholder implementation
    // In a real implementation, this would query the database using the dbConfigNode
    
    // Helper function for mock roles
    function getMockRoles() {
      return [
        { id: '1', name: 'Solutions Architect', description: 'Designs high-level software architecture based on requirements.' },
        { id: '2', name: 'Project Manager', description: 'Oversees project execution, timeline, and resource allocation.' },
        { id: '3', name: 'Developer', description: 'Implements software components based on specifications.' }
      ];
    }
    
    try {
      // Check if dbConfigNode has a getClient method (for database access)
      if (dbConfigNode.getClient) {
        try {
          const client = await dbConfigNode.getClient();
          
          // Check if roles table exists, create if it doesn't
          await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              description TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          // Query roles table
          const result = await client.query(
            'SELECT id, name, description, created_at, updated_at FROM roles ORDER BY name ASC'
          );
          
          return result.rows;
        } catch (dbError) {
          console.error('Database connection error:', dbError);
          // Fall back to mock data if database connection fails
          return getMockRoles();
        }
      } else {
        // No database client available, return mock data
        return getMockRoles();
      }
    } catch (error) {
      console.error('Database error when fetching roles:', error);
      throw new Error('Database error: ' + error.message);
    }
  }
  
  /**
   * Save role to database
   * @param {Object} role - Role object
   * @param {Object} dbConfigNode - Database config node
   * @returns {Promise<Object>} - Saved role
   */
  async function saveRoleToDb(role, dbConfigNode) {
    // This is a placeholder implementation
    // In a real implementation, this would save to the database using the dbConfigNode
    
    // Helper function to create a mock role response
    function createMockRole(role) {
      return {
        id: role.id || Math.random().toString(36).substring(2, 15),
        name: role.name,
        description: role.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    
    try {
      // Check if dbConfigNode has a getClient method (for database access)
      if (dbConfigNode.getClient) {
        try {
          const client = await dbConfigNode.getClient();
          
          // Ensure roles table exists
          await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              description TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          let result;
          
          if (role.id) {
            // Update existing role
            result = await client.query(
              'UPDATE roles SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
              [role.name, role.description, role.id]
            );
          } else {
            // Insert new role
            result = await client.query(
              'INSERT INTO roles (name, description, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
              [role.name, role.description]
            );
          }
          
          if (result.rows.length > 0) {
            return result.rows[0];
          } else {
            throw new Error('Failed to save role');
          }
        } catch (dbError) {
          console.error('Database connection error when saving role:', dbError);
          // Fall back to mock response
          return createMockRole(role);
        }
      } else {
        // No database client available, return mock response
        return createMockRole(role);
      }
    } catch (error) {
      console.error('Database error when saving role:', error);
      throw new Error('Database error: ' + error.message);
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
