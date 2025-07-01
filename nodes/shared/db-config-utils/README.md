# DB Config Utilities

This module provides shared utilities for working with DB Config nodes in Node-RED. It's designed to be used by multiple nodes in the `node-red-contrib-ai-sombrero` package, ensuring consistent behavior when working with database connections.

## Server-side Utilities

The server-side utilities are available in `index.js` and provide functions for:

- Initializing DB Config nodes
- Getting DB Config node instances
- Executing database queries
- Creating tables if they don't exist

### Usage

```javascript
// In your Node-RED node implementation
module.exports = function(RED) {
  const dbConfigUtils = require('../../nodes/shared/db-config-utils')(RED);
  
  // Get a DB Config node instance
  const dbConfigNode = dbConfigUtils.getDbConfigNode(dbConfigId);
  
  // Execute a database query
  const result = await dbConfigUtils.executeQuery(dbConfigNode, query, params);
  
  // Create a table if it doesn't exist
  await dbConfigUtils.createTableIfNotExists(dbConfigNode, tableName, schema);
}
```

## Client-side Utilities

The client-side utilities are available in `ui.js` and provide functions for:

- Initializing DB Config nodes in the editor
- Saving DB Config node values during `oneditsave`
- Getting selected DB Config node IDs
- Checking if a DB Config node is selected

### Usage

```html
<!-- In your Node-RED node HTML file -->
<script type="text/javascript" src="shared/db-config-utils/ui.js"></script>

<script type="text/javascript">
  RED.nodes.registerType('your-node', {
    // ...
    oneditprepare: function() {
      // Initialize DB Config node
      RED.dbConfigUtils.initDbConfigNode('dbConfig', false);
    },
    oneditsave: function() {
      // Save DB Config node value
      RED.dbConfigUtils.saveDbConfigNode(this, 'dbConfig');
    }
  });
</script>
```

## Benefits

- Consistent behavior across nodes
- Reduced code duplication
- Easier maintenance
- Better error handling
- Support for multiple database types (PostgreSQL, MySQL, SQLite)
