// shared/role-manager/index.js

module.exports = function(RED) {
    const dbConfigUtils = require('../nodes/shared/db-config-utils')(RED);

    const TABLE_NAME = 'roles';

    /**
     * Initializes the roles table if it doesn't exist.
     * @param {Object} dbConfigNode - The DB Config node instance.
     */
    async function initializeRolesTable(dbConfigNode) {
        const schema = `
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        `; // SQLite schema, will need to adjust for Postgres/MySQL if different
        try {
            await dbConfigUtils.createTableIfNotExists(dbConfigNode, TABLE_NAME, schema);
            RED.log.info(`Table '${TABLE_NAME}' initialized or already exists.`);
        } catch (error) {
            RED.log.error(`Error initializing table '${TABLE_NAME}': ${error.message}`);
            throw error;
        }
    }

    /**
     * Creates a new role.
     * @param {Object} dbConfigNode - The DB Config node instance.
     * @param {Object} role - The role object { name, description }.
     * @returns {Promise<Object>} - The created role.
     */
    async function createRole(dbConfigNode, role) {
        const { name, description } = role;
        const query = `INSERT INTO ${TABLE_NAME} (name, description) VALUES (?, ?)`;
        const params = [name, description];
        try {
            const result = await dbConfigUtils.executeQuery(dbConfigNode, query, params);
            // For SQLite, result.lastID might be available. For Postgres/MySQL, need to adjust.
            // Assuming SQLite for now based on previous observations.
            return { id: result.lastID, name, description };
        } catch (error) {
            RED.log.error(`Error creating role: ${error.message}`);
            throw error;
        }
    }

    /**
     * Retrieves a role by ID or name.
     * @param {Object} dbConfigNode - The DB Config node instance.
     * @param {string|number} identifier - The ID or name of the role.
     * @returns {Promise<Object|null>} - The role object or null if not found.
     */
    async function getRole(dbConfigNode, identifier) {
        let query;
        let params;
        if (typeof identifier === 'number') {
            query = `SELECT * FROM ${TABLE_NAME} WHERE id = ?`;
            params = [identifier];
        } else {
            query = `SELECT * FROM ${TABLE_NAME} WHERE name = ?`;
            params = [identifier];
        }m
        try {
            const result = await dbConfigUtils.executeQuery(dbConfigNode, query, params);
            // Assuming result.rows for Postgres/MySQL, or direct result for SQLite
            return result[0] || null; // Return the first row or null
        } catch (error) {
            RED.log.error(`Error getting role: ${error.message}`);
            throw error;
        }
    }

    /**
     * Updates an existing role.
     * @param {Object} dbConfigNode - The DB Config node instance.
     * @param {number} id - The ID of the role to update.
     * @param {Object} updates - An object containing fields to update (e.g., { name, description }).
     * @returns {Promise<boolean>} - True if updated successfully, false otherwise.
     */
    async function updateRole(dbConfigNode, id, updates) {
        const setClauses = [];
        const params = [];
        for (const key in updates) {
            if (updates.hasOwnProperty(key)) {
                setClauses.push(`${key} = ?`);
                params.push(updates[key]);
            }
        }
        if (setClauses.length === 0) {
            return false; // Nothing to update
        }
        params.push(id);
        const query = `UPDATE ${TABLE_NAME} SET ${setClauses.join(', ')} WHERE id = ?`;
        try {
            const result = await dbConfigUtils.executeQuery(dbConfigNode, query, params);
            return result.changes > 0; // For SQLite, indicates number of rows changed
        } catch (error) {
            RED.log.error(`Error updating role: ${error.message}`);
            throw error;
        }
    }

    /**
     * Deletes a role by ID.
     * @param {Object} dbConfigNode - The DB Config node instance.
     * @param {number} id - The ID of the role to delete.
     * @returns {Promise<boolean>} - True if deleted successfully, false otherwise.
     */
    async function deleteRole(dbConfigNode, id) {
        const query = `DELETE FROM ${TABLE_NAME} WHERE id = ?`;
        const params = [id];
        try {
            const result = await dbConfigUtils.executeQuery(dbConfigNode, query, params);
            return result.changes > 0; // For SQLite, indicates number of rows changed
        } catch (error) {
            RED.log.error(`Error deleting role: ${error.message}`);
            throw error;
        }
    }

    return {
        initializeRolesTable,
        createRole,
        getRole,
        updateRole,
        deleteRole,
    };
};
