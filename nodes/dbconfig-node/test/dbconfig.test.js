const DbConfigNode = require('../dbconfig.js');

// Mock database modules
const mockPgPool = {
    query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
    end: jest.fn().mockResolvedValue(undefined),
};
const mockMysqlConnection = {
    execute: jest.fn().mockResolvedValue([[], []]),
    end: jest.fn().mockResolvedValue(undefined),
};
const mockSqliteConnection = {
    exec: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('pg', () => ({
    Pool: jest.fn(() => mockPgPool),
}));
jest.mock('mysql2/promise', () => ({
    createConnection: jest.fn().mockResolvedValue(mockMysqlConnection),
}));
jest.mock('sqlite', () => ({
    open: jest.fn().mockResolvedValue(mockSqliteConnection),
}));
const mockSqlite3Database = jest.fn();
jest.mock('sqlite3', () => ({
    verbose: jest.fn(() => ({
        Database: mockSqlite3Database,
    })),
    Database: mockSqlite3Database,
}));

describe('DbConfigNode', () => {
    let RED;
    let mockNodes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockNodes = {
            createNode: jest.fn(),
            registerType: jest.fn(),
            eachConfig: jest.fn(),
            getNode: jest.fn(),
        };
        RED = {
            nodes: mockNodes,
            log: {
                debug: jest.fn(),
                trace: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                info: jest.fn(),
            },
            util: {
                // Mock any util functions used by dbconfig.js if necessary
            },
            settings: {
                // Mock any settings used by dbconfig.js if necessary
            },
        };
        // Load the node with the mocked RED object
        DbConfigNode(RED);
    });

    // Helper function to simulate node creation and get a mock node instance
    const createMockNode = (config) => {
        const node = {
            id: config.id || 'test-node-id',
            name: config.name || 'test node',
            type: config.type || 'dbconfig',
            on: jest.fn((event, callback) => {
                if (event === 'close') node.closeCallback = callback;
            }),
            status: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
            // Simulate emit for 'close' event
            emit: (event) => {
                if (event === 'close' && node.closeCallback) {
                    const mockDone = jest.fn();
                    node.closeCallback(mockDone);
                    node.mockDone = mockDone; // Expose mockDone for assertions if needed
                }
            },
            ...config
        };
        mockNodes.createNode.mockImplementationOnce(function(n, conf) {
            Object.assign(n, node);
        });
        // Simulate the node being registered and created
        mockNodes.registerType.mock.calls.forEach(call => {
            if (call[0] === 'dbconfig') {
                call[1].call(node, config);
            }
        });
        return node;
    };

    it('should be loaded and register type', () => {
        expect(RED.nodes.registerType).toHaveBeenCalledWith('dbconfig', expect.any(Function), {
            credentials: { password: { type: 'password' } }
        });
    });

    it('should create a node instance', () => {
        const config = { id: 'n1', name: 'test dbconfig' };
        const n1 = createMockNode(config);
        expect(RED.nodes.createNode).toHaveBeenCalledWith(expect.any(Object), config);
        expect(n1).toBeDefined();
        expect(n1.name).toEqual('test dbconfig');
    });

    it('should connect to PostgreSQL successfully', async () => {
        const config = {
            id: 'n1', type: 'dbconfig', name: 'pg_test',
            dbType: 'postgresql', host: 'localhost', port: '5432',
            user: 'testuser', password: 'testpassword', database: 'testdb'
        };
        const n1 = createMockNode(config);

        // Wait for connection attempt
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(n1.status).toHaveBeenCalledWith({ fill: "green", shape: "dot", text: "connected" });
        expect(mockPgPool.query).toHaveBeenCalledWith('SELECT NOW()');
    });

    it('should connect to MySQL successfully', async () => {
        const config = {
            id: 'n1', type: 'dbconfig', name: 'mysql_test',
            dbType: 'mysql', host: 'localhost', port: '3306',
            user: 'testuser', password: 'testpassword', database: 'testdb'
        };
        const n1 = createMockNode(config);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(n1.status).toHaveBeenCalledWith({ fill: "green", shape: "dot", text: "connected" });
        expect(require('mysql2/promise').createConnection).toHaveBeenCalledTimes(1);
    });

    it('should connect to SQLite successfully', async () => {
        const config = {
            id: 'n1', type: 'dbconfig', name: 'sqlite_test',
            dbType: 'sqlite', filename: '/tmp/test.sqlite'
        };
        const n1 = createMockNode(config);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(n1.status).toHaveBeenCalledWith({ fill: "green", shape: "dot", text: "connected" });
        expect(require('sqlite').open).toHaveBeenCalledWith({
            filename: '/tmp/test.sqlite',
            driver: mockSqlite3Database
        });
    });

    it('should handle PostgreSQL connection error', async () => {
        mockPgPool.query.mockRejectedValueOnce(new Error('PG Connection Failed'));

        const config = {
            id: 'n1', type: 'dbconfig', name: 'pg_error',
            dbType: 'postgresql', host: 'badhost', port: '5432',
            user: 'testuser', password: 'testpassword', database: 'testdb'
        };
        const n1 = createMockNode(config);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(n1.status).toHaveBeenCalledWith({ fill: "red", shape: "ring", text: "disconnected" });
        expect(n1.error).toHaveBeenCalledWith(expect.stringContaining('Failed to connect to database: PG Connection Failed'), expect.any(Error));
    });

    it('should disconnect on close', async () => {
        const config = {
            id: 'n1', type: 'dbconfig', name: 'pg_close',
            dbType: 'postgresql', host: 'localhost', port: '5432',
            user: 'testuser', password: 'testpassword', database: 'testdb'
        };
        const n1 = createMockNode(config);

        await new Promise(resolve => setTimeout(resolve, 100));
        // Ensure connection is established first
        expect(n1.status).toHaveBeenCalledWith({ fill: "green", shape: "dot", text: "connected" });

        n1.emit('close');
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockPgPool.end).toHaveBeenCalledTimes(1);
        // Optionally, assert that mockDone was called if the close handler completes
        expect(n1.mockDone).toHaveBeenCalledTimes(1);
    });
});
