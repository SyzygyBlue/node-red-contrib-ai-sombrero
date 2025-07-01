/**
 * DB Config Node UI Utilities
 * Provides helper functions for integrating with the DB Config node in the Node-RED editor
 */

(function() {
  // Create namespace for DB Config utilities
  if (typeof window.RED.dbConfigUtils === 'undefined') {
    window.RED.dbConfigUtils = {};
  }

  /**
   * Initialize a DB Config node in the editor
   * @param {string} nodeId - The ID of the node input element (without the 'node-input-' prefix)
   * @param {boolean} required - Whether the DB Config node is required
   */
  window.RED.dbConfigUtils.initDbConfigNode = function(nodeId, required = false) {
    const fullNodeId = `node-input-${nodeId}`;
    
    // Initialize the config node
    RED.nodes.config.init({
      id: fullNodeId,
      type: 'dbconfig-node',
      required: required
    });
  };

  /**
   * Save the DB Config node value during oneditsave
   * @param {Object} node - The node being edited
   * @param {string} nodeId - The ID of the node input element (without the 'node-input-' prefix)
   */
  window.RED.dbConfigUtils.saveDbConfigNode = function(node, nodeId) {
    const fullNodeId = `node-input-${nodeId}`;
    node[nodeId] = $(`#${fullNodeId}`).val() || '';
  };

  /**
   * Get the selected DB Config node ID
   * @param {string} nodeId - The ID of the node input element (without the 'node-input-' prefix)
   * @returns {string} - The selected DB Config node ID
   */
  window.RED.dbConfigUtils.getSelectedDbConfigNodeId = function(nodeId) {
    const fullNodeId = `node-input-${nodeId}`;
    return $(`#${fullNodeId}`).val() || '';
  };

  /**
   * Check if a DB Config node is selected
   * @param {string} nodeId - The ID of the node input element (without the 'node-input-' prefix)
   * @returns {boolean} - True if a DB Config node is selected
   */
  window.RED.dbConfigUtils.hasDbConfigNodeSelected = function(nodeId) {
    const fullNodeId = `node-input-${nodeId}`;
    const value = $(`#${fullNodeId}`).val();
    return value && value.trim() !== '';
  };
})();
