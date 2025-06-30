# Use a Node.js 18 slim image as the base
FROM node:18-slim

# Install build tools and Python for npm packages that require compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set the Node-RED user directory as the working directory
# Node-RED will store flows, credentials, and installed modules here
WORKDIR /data

# Install Node-RED globally
RUN npm install -g node-red

# Copy the custom settings.js file into the Node-RED user directory
COPY settings.js /data/

# Create a directory for Node-RED logs within the user directory
RUN mkdir -p /data/logs

# Expose Node-RED port
EXPOSE 1880

# Set the default command to run when starting the container
# Use the settings.js file for configuration, and set userDir to /data
CMD ["node-red", "-s", "/data/settings.js", "-u", "/data"]
