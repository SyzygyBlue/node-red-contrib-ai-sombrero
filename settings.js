// Custom Node-RED settings file for AI Sombrero

module.exports = {
    // The httpRoot path is the URL path used to serve the editor and runtime API.
    // Defaults to /.
    httpRoot: "/",

    // The userDir is the directory where Node-RED will store its user data,
    // including flows, credentials, and modules.
    userDir: "/data",

    // Logging configuration
    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        },
        file: {
            level: "info",
            metrics: false,
            audit: true, // Enable audit logging to file
            // Path to the log file. This will be relative to the userDir
            // unless an absolute path is provided.
            // We'll use an absolute path to ensure it goes into the logs directory
            // which will be mounted as a volume.
            path: "/data/logs/node-red.log",
            // Max size of the log file in bytes before it is rotated
            maxBytes: 5000000, // 5MB
            // Number of log files to keep after rotation
            maxFiles: 5
        }
    },

    // Disable editor themes to avoid potential issues with custom themes
    editorTheme: {
        projects: {
            enabled: true
        }
    },

    // Custom Node-RED nodes can be added here
    // This project's nodes will be automatically discovered since they are in the userDir
    nodesDir: "/data/nodes",

    // Global context that can be accessed by all flows
    // context: {
    //     global: { }
    // },

    // Export the flow file as a single JSON file
    flowFile: "flows.json",

    // Credential secret for encrypting credentials
    credentialSecret: "a-long-random-string-for-credential-encryption",

    // Other settings can be added here as needed
};
