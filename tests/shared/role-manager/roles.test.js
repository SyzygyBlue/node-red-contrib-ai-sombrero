// tests/shared/role-manager/roles.test.js

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

describe('Role Manager', () => {
    let db;
    let mockDbConfigNode;
    let mockRED;
    let roleManager;

    beforeAll(async () => {
        // Mock the RED object
        mockRED = {
            log: {
                info: jest.fn(),
                error: jest.fn(),
            },
            nodes: {
                getNode: jest.fn(),
                // Mock the config object if needed by db-config-utils
                config: {
                    init: jest.fn(),
                },
            },
        };

        // Initialize an in-memory SQLite database
        db = await open({
            filename: ':memory:',
            driver: sqlite3.Database
        });

        // Mock dbConfigNode to use our in-memory database
        mockDbConfigNode = {
            dbType: 'sqlite',
            getClient: async () => db, // Return the in-memory db instance
            // Add other properties if db-config-utils expects them
        };

        // Mock db-config-utils to use our mockDbConfigNode
        const mockDbConfigUtilsInstance = mockDbConfigUtilsModule(mockRED);

        mockDbConfigUtilsInstance.executeQuery.mockImplementation(async (dbConfigNode, query, params) => {
            if (query.includes('CREATE TABLE')) {
                return { changes: 1 }; // Simulate table creation success
            }
            if (query.includes('INSERT INTO roles')) {
                if (params[0] === 'error_role') {
                    throw new Error('Simulated DB error during insert');
                }
                return { lastID: 1, changes: 1 }; // Simulate insert success
            }
            if (query.includes('SELECT * FROM roles WHERE id = ?')) {
                if (params[0] === 999) {
                    return []; // Not found
                }
                return [{ id: params[0], name: 'Test Role', description: 'A test role' }];
            }
            if (query.includes('UPDATE roles SET')) {
                if (params[0] === 'error_update') {
                    throw new Error('Simulated DB error during update');
                }
                return { changes: 1 }; // Simulate update success
            }
            if (query.includes('DELETE FROM roles')) {
                if (params[0] === 999) {
                    throw new Error('Simulated DB error during delete');
                }
                return { changes: 1 }; // Simulate delete success
            }
            return {};
        });

        mockDbConfigUtilsInstance.createTableIfNotExists.mockResolvedValue(true);

        // Import the roleManager module, passing the mocked RED object
        roleManager = require('../../../shared/role-manager')(mockRED);
    });

    afterAll(async () => {
        await db.close();
    });

    beforeEach(async () => {
        // Clear and re-initialize the table before each test
        await db.exec(`DROP TABLE IF EXISTS roles;`);
        await roleManager.initializeRolesTable(mockDbConfigNode);
    });

    test('should initialize the roles table', async () => {
        const result = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='roles';");
        expect(result).toBeDefined();
        expect(result.name).toBe('roles');
        expect(mockRED.log.info).toHaveBeenCalledWith("Table 'roles' initialized or already exists.");
    });

    test('should create a new role', async () => {
        const newRole = { name: 'Test Role', description: 'A role for testing' };
        const createdRole = await roleManager.createRole(mockDbConfigNode, newRole);

        expect(createdRole).toBeDefined();
        expect(createdRole.id).toBe(1);
        expect(createdRole.name).toBe(newRole.name);
        expect(createdRole.description).toBe(newRole.description);

        const fetchedRole = await db.get(`SELECT * FROM roles WHERE id = ${createdRole.id}`);
        expect(fetchedRole.name).toBe(newRole.name);
        expect(fetchedRole.description).toBe(newRole.description);
    });

    test('should get a role by ID', async () => {
        await roleManager.createRole(mockDbConfigNode, { name: 'Role A', description: 'Description A' });
        const createdRoleB = await roleManager.createRole(mockDbConfigNode, { name: 'Role B', description: 'Description B' });

        const fetchedRole = await roleManager.getRole(mockDbConfigNode, createdRoleB.id);
        expect(fetchedRole).toBeDefined();
        expect(fetchedRole.name).toBe('Role B');
    });

    test('should get a role by name', async () => {
        await roleManager.createRole(mockDbConfigNode, { name: 'Role C', description: 'Description C' });
        await roleManager.createRole(mockDbConfigNode, { name: 'Role D', description: 'Description D' });

        const fetchedRole = await roleManager.getRole(mockDbConfigNode, 'Role C');
        expect(fetchedRole).toBeDefined();
        expect(fetchedRole.description).toBe('Description C');
    });

    test('should return null if role not found', async () => {
        const fetchedRole = await roleManager.getRole(mockDbConfigNode, 999);
        expect(fetchedRole).toBeNull();
    });

    test('should update an existing role', async () => {
        const createdRole = await roleManager.createRole(mockDbConfigNode, { name: 'Old Name', description: 'Old Description' });
        const updated = await roleManager.updateRole(mockDbConfigNode, createdRole.id, { name: 'New Name', description: 'New Description' });

        expect(updated).toBe(true);
        const fetchedRole = await db.get(`SELECT * FROM roles WHERE id = ${createdRole.id}`);
        expect(fetchedRole.name).toBe('New Name');
        expect(fetchedRole.description).toBe('New Description');
    });

    test('should delete a role', async () => {
        const createdRole = await roleManager.createRole(mockDbConfigNode, { name: 'To Be Deleted', description: 'Ephemeral' });
        const deleted = await roleManager.deleteRole(mockDbConfigNode, createdRole.id);

        expect(deleted).toBe(true);
        const fetchedRole = await db.get(`SELECT * FROM roles WHERE id = ${createdRole.id}`);
        expect(fetchedRole).toBeUndefined();
    });

    test('should handle error during table initialization', async () => {
        // Temporarily break the db object to simulate an error
        const originalExec = db.exec;
        db.exec = jest.fn().mockRejectedValue(new Error('Simulated DB error'));

        await expect(roleManager.initializeRolesTable(mockDbConfigNode)).rejects.toThrow('Simulated DB error');
        expect(mockRED.log.error).toHaveBeenCalledWith(expect.stringContaining("Error initializing table 'roles'"), expect.any(Error));

        // Restore original exec
        db.exec = originalExec;
    });

    test('should handle error during createRole', async () => {
        const originalExecuteQuery = mockDbConfigUtils.executeQuery;
        mockDbConfigUtils.executeQuery = jest.fn().mockRejectedValue(new Error('Simulated create error'));

        await expect(roleManager.createRole(mockDbConfigNode, { name: 'Error Role', description: 'Error Desc' })).rejects.toThrow('Simulated create error');
        expect(mockRED.log.error).toHaveBeenCalledWith(expect.stringContaining("Error creating role: Simulated create error"));

        mockDbConfigUtils.executeQuery = originalExecuteQuery;
    });

    test('should handle error during getRole', async () => {
        const originalExecuteQuery = mockDbConfigUtils.executeQuery;
        mockDbConfigUtils.executeQuery = jest.fn().mockRejectedValue(new Error('Simulated get error'));

        await expect(roleManager.getRole(mockDbConfigNode, 1)).rejects.toThrow('Simulated get error');
        expect(mockRED.log.error).toHaveBeenCalledWith(expect.stringContaining("Error getting role: Simulated get error"));

        mockDbConfigUtils.executeQuery = originalExecuteQuery;
    });

    test('should handle error during updateRole', async () => {
        const originalExecuteQuery = mockDbConfigUtils.executeQuery;
        mockDbConfigUtils.executeQuery = jest.fn().mockRejectedValue(new Error('Simulated update error'));

        await expect(roleManager.updateRole(mockDbConfigNode, 1, { name: 'New Name' })).rejects.toThrow('Simulated update error');
        expect(mockRED.log.error).toHaveBeenCalledWith(expect.stringContaining("Error updating role: Simulated update error"));

        mockDbConfigUtils.executeQuery = originalExecuteQuery;
    });

    test('should handle error during deleteRole', async () => {
        const originalExecuteQuery = mockDbConfigUtils.executeQuery;
        mockDbConfigUtils.executeQuery = jest.fn().mockRejectedValue(new Error('Simulated delete error'));

        await expect(roleManager.deleteRole(mockDbConfigNode, 1)).rejects.toThrow('Simulated delete error');
        expect(mockRED.log.error).toHaveBeenCalledWith(expect.stringContaining("Error deleting role: Simulated delete error"));

        mockDbConfigUtils.executeQuery = originalExecuteQuery;
    });
});
