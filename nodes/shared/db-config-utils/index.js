/**
 * DB Config Node Utilities
 * Provides helper functions for integrating with the DB Config node
 */

module.exports = function(RED) {
  /**
   * Initialize a DB Config node in the editor
   * @param {string} nodeId - The ID of the node input element
   * @param {boolean} required - Whether the DB Config node is required
   */
  function initDbConfigNode(nodeId, required = false) {
    RED.nodes.config.init({
      id: nodeId,
      type: 'dbconfig-node',
      required: required
    });
  }

  /**
   * Get a DB Config node instance
   * @param {string} dbConfigId - The ID of the DB Config node
   * @returns {Object|null} - The DB Config node instance or null if not found
   */
  function getDbConfigNode(dbConfigId) {
    if (!dbConfigId) return null;
    return RED.nodes.getNode(dbConfigId);
  }

  /**
   * Execute a database query using the DB Config node
   * @param {Object} dbConfigNode - The DB Config node instance
   * @param {string} query - The SQL query to execute
   * @param {Array} params - The parameters for the query
   * @returns {Promise<Object>} - The query result
   */
  async function executeQuery(dbConfigNode, query, params = []) {
    if (!dbConfigNode) {
      throw new Error('DB Config node is required');
    }

    try {
      const client = await dbConfigNode.getClient();
      
      if (!client) {
        throw new Error('Could not get database client');
      }

      // Handle different database types
      if (dbConfigNode.dbType === 'postgresql') {
        return await client.query(query, params);
      } else if (dbConfigNode.dbType === 'mysql') {
        return await client.execute(query, params);
      } else if (dbConfigNode.dbType === 'sqlite') {
        return await client.all(query, params);
      } else {
        throw new Error(`Unsupported database type: ${dbConfigNode.dbType}`);
      }
    } catch (err) {
      throw new Error(`Database query failed: ${err.message}`);
    }
  }

  /**
   * Create a table if it doesn't exist
   * @param {Object} dbConfigNode - The DB Config node instance
   * @param {string} tableName - The name of the table to create
   * @param {string} schema - The schema definition for the table
   * @returns {Promise<boolean>} - True if the table was created or already exists
   */
  async function createTableIfNotExists(dbConfigNode, tableName, schema) {
    if (!dbConfigNode) {
      throw new Error('DB Config node is required');
    }

    try {
      const client = await dbConfigNode.getClient();
      
      if (!client) {
        throw new Error('Could not get database client');
      }

      // Create table query based on database type
      let query;
      if (dbConfigNode.dbType === 'postgresql' || dbConfigNode.dbType === 'mysql') {
        query = `CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`;
      } else if (dbConfigNode.dbType === 'sqlite') {
        query = `CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`;
      } else {
        throw new Error(`Unsupported database type: ${dbConfigNode.dbType}`);
      }

      await executeQuery(dbConfigNode, query);
      return true;
    } catch (err) {
      throw new Error(`Failed to create table: ${err.message}`);
    }
  }

  return {
    initDbConfigNode,
    getDbConfigNode,
    executeQuery,
    createTableIfNotExists
  };
};
