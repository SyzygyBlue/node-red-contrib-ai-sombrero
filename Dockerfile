FROM node:18-alpine

WORKDIR /usr/src/app

# Install system dependencies
RUN apk add --no-cache git python3 make g++

# Install Node-RED and dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Install development dependencies if in development
RUN if [ "$NODE_ENV" = "development" ]; then \
      npm install --only=dev; \
    fi

# Expose Node-RED port
EXPOSE 1880

# Set the default command to run when starting the container
CMD [ "npm", "start" ]
