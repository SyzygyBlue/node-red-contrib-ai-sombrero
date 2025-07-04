module.exports = function(RED) {
    const path = require('path');

    function DbConfigNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        this.name = config.name;
        this.dbType = config.dbType;
        this.host = config.host;
        this.port = config.port;
        this.user = config.user;
        this.password = config.password;
        this.database = config.database;
        this.filename = config.filename || path.join(RED.settings.userDir, 'sqlite-default.db');

        node.log(`SQLite filename: ${node.filename}`);

        // This will store the database connection object
        node.connection = null;

        // Function to establish database connection
        node.connect = async function() {
            try {
                if (node.connection) {
                    node.log("Existing connection found, closing it.");
                    await node.disconnect();
                }

                switch (node.dbType) {
                    case 'postgresql':
                        const { Pool } = require('pg');
                        node.connection = new Pool({
                            host: node.host,
                            port: node.port,
                            user: node.user,
                            password: node.password,
                            database: node.database,
                            // Make SSL optional to support both local and remote connections
                            ssl: node.host !== 'localhost' && node.host !== '127.0.0.1' ? 
                                { rejectUnauthorized: false } : false
                        });
                        await node.connection.query('SELECT NOW()'); // Test connection
                        node.status({ fill: "green", shape: "dot", text: "connected" });
                        node.log(`Connected to PostgreSQL database: ${node.database}`);
                        break;
                    case 'mysql':
                        const mysql = require('mysql2/promise');
                        node.connection = await mysql.createConnection({
                            host: node.host,
                            port: node.port,
                            user: node.user,
                            password: node.password,
                            database: node.database
                        });
                        node.status({ fill: "green", shape: "dot", text: "connected" });
                        node.log(`Connected to MySQL database: ${node.database}`);
                        break;
                    case 'sqlite':
                        // SQLite does not need host/port/user/password
                        node.user = '';
                        node.password = '';
                        const sqlite3 = require('sqlite3').verbose();
                        const { open } = require('sqlite');
                        node.connection = await open({
                            filename: node.filename,
                            driver: sqlite3.Database
                        });
                        // Provide a pg-like query wrapper for compatibility with RoleManager and other utils
                        if (typeof node.connection.query !== 'function') {
                            node.connection.query = async (sql, params = []) => {
                                const isSelect = /^\s*select/i.test(sql);
                                const hasReturning = /\bRETURNING\b/i.test(sql);
                                if (isSelect || hasReturning) {
                                    // SQLite supports `RETURNING` from version 3.35.0, use .all to capture rows
                                    const rows = await node.connection.all(sql, params);
                                    return {
                                        rows,
                                        rowCount: rows.length,
                                    };
                                }
                                // For INSERT/UPDATE/DELETE without RETURNING
                                const result = await node.connection.run(sql, params);
                                return {
                                    rows: [],
                                    rowCount: result?.changes ?? 0,
                                    lastID: result?.lastID
                                };
                            };
                        }
                        node.status({ fill: "green", shape: "dot", text: "connected" });
                        node.log(`Connected to SQLite database: ${node.filename}`);
                        break;
                    default:
                        throw new Error(`Unsupported database type: ${node.dbType}`);
                }
            } catch (err) {
                node.error(`Failed to connect to database: ${err.message}`, err);
                node.status({ fill: "red", shape: "ring", text: "disconnected" });
                node.connection = null;
            }
        };

        // Function to disconnect from database
        node.disconnect = async function() {
            if (node.connection) {
                try {
                    if (node.dbType === 'postgresql') {
                        await node.connection.end();
                    } else if (node.dbType === 'mysql') {
                        await node.connection.end();
                    } else if (node.dbType === 'sqlite') {
                        await node.connection.close();
                    }
                    node.log("Database connection closed.");
                } catch (err) {
                    node.error(`Error closing database connection: ${err.message}`, err);
                } finally {
                    node.connection = null;
                }
            }
        };

        // Connect on deploy/start
        node.on('close', function(done) {
            node.disconnect().then(() => done()).catch(err => {
                node.error("Error during node close disconnect: " + err.message);
                done();
            });
        });

        // Initial connection attempt
        node.connect();
        
        // Method to get a client for database operations
        node.getClient = async function() {
            if (!node.connection) {
                await node.connect();
            }
            if (!node.connection) {
                throw new Error('Could not establish database connection');
            }
            return node.connection;
        };
    }

    RED.nodes.registerType("dbconfig-node", DbConfigNode, {
        category: "config", // Add this line
        credentials: {
            password: { type: "password" }
        }
    });
}
