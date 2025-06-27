# Development Setup

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ and npm 8+ (for local development)
- Git

## Database Access

### Standard Project User
- **Host**: localhost
- **Port**: 5432
- **Database**: ai_workflow_db
- **User**: user
- **Password**: password

### Superuser (root) Account
- **Host**: localhost
- **Port**: 5432
- **User**: root
- **Password**: Defined in `pg_root_password.txt` (P@ssw0rd1 for development)

### Connecting to PostgreSQL

```bash
# Connect with standard user
psql -h localhost -U user -d ai_workflow_db

# Connect as superuser
psql -h localhost -U root -d postgres
```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
NODE_ENV=development
NODE_RED_ENABLE_PROJECTS=false

# Database
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=ai_workflow_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Node-RED
NODE_RED_CREDENTIAL_SECRET=your-secret-key-here
FLOWS=flows.json
```

## Running the Application

### Development with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Local Development

```bash
# Install dependencies
npm install

# Start Node-RED
npm start
```

## Testing

Run tests with:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```
