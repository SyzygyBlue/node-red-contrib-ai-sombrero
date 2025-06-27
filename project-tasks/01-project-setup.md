# Project Setup Tasks

## Infrastructure Setup

### Version Control
- [ ] Initialize Git repository in the project's root directory
- [ ] Create `.gitignore` with standard Node.js and Node-RED ignores
  ```
  # Node.js
  node_modules/
  .env
  .env.local
  
  # Node-RED
  .node-red/
  
  # Testing
  coverage/
  
  # IDE
  .vscode/
  .idea/
  
  # OS
  .DS_Store
  Thumbs.db
  ```
- [ ] Make initial commit with project structure

### Code Quality
- [ ] Set up ESLint with Node-RED configuration
  ```bash
  npm install --save-dev eslint eslint-plugin-node eslint-config-standard eslint-plugin-import eslint-plugin-promise eslint-plugin-n
  ```
- [ ] Create `.eslintrc.json` with Node-RED specific settings
  ```json
  {
    "env": { "node": true, "es2021": true },
    "extends": ["standard"],
    "globals": { "RED": "readonly" },
    "parserOptions": { "ecmaVersion": 2021 },
    "rules": {
      "no-console": "warn",
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  }
  ```
- [ ] Set up Prettier for code formatting
  ```bash
  npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
  ```
- [ ] Create `.prettierrc.json`
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "tabWidth": 2,
    "printWidth": 100,
    "trailingComma": "es5"
  }
  ```
- [ ] Update `package.json` with lint and format scripts
  ```json
  "scripts": {
    "lint": "eslint . --ext .js",
    "format": "prettier --write .",
    "lint:fix": "eslint . --ext .js --fix"
  }
  ```

### Testing Framework
- [ ] Set up Jest testing framework
  ```bash
  npm install --save-dev jest @types/jest ts-jest
  ```
- [ ] Configure Jest in `jest.config.js`
  ```javascript
  module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['nodes/**/*.js', 'services/**/*.js', 'helpers/**/*.js'],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  };
  ```
- [ ] Add test scripts to `package.json`
  ```json
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  }
  ```

### Docker Development Environment
- [ ] Create `Dockerfile` for development
  ```dockerfile
  FROM node:18-alpine
  
  WORKDIR /usr/src/app
  
  COPY package*.json ./
  RUN npm install
  
  COPY . .
  
  EXPOSE 1880
  
  CMD ["npm", "start"]
  ```
- [ ] Create `pg_root_password.txt` with a secure password for the PostgreSQL superuser
  ```
  P@ssw0rd1
  ```
- [ ] Create `docker-compose.yml` with Node-RED and PostgreSQL
  ```yaml
  version: '3.8'
  
  services:
    node-red:
      build: .
      container_name: node-red-ai
      ports:
        - "1880:1880"
      volumes:
        - ./:/usr/src/app
        - node_red_data:/data
      environment:
        - NODE_ENV=development
      depends_on:
        - postgres
    
    postgres:
      image: postgres:16-alpine
      container_name: ai-workflow-postgres
      restart: unless-stopped
      environment:
        POSTGRES_USER: user                    # Standard project user
        POSTGRES_PASSWORD: password           # Standard user password
        POSTGRES_DB: ai_workflow_db           # Default database
        POSTGRES_INITDB_ARGS: "--username=root --pwfile=/run/secrets/pg_root_pw"
      ports:
        - "5432:5432"
      volumes:
        - pgdata:/var/lib/postgresql/data
      secrets:
        - pg_root_pw
  
  volumes:
    node_red_data:
    pgdata:
  
  secrets:
    pg_root_pw:
      file: ./pg_root_password.txt
  ```
- [ ] Document database access in `docs/development-setup.md`
  ```markdown
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
  - **Password**: Defined in `pg_root_password.txt`
  
  ### Connecting to PostgreSQL
  ```bash
  # Connect with standard user
  psql -h localhost -U user -d ai_workflow_db
  
  # Connect as superuser
  psql -h localhost -U root -d postgres
  ```
  ```
- [ ] Add database connection configuration to documentation

### CI/CD Pipeline
- [ ] Set up GitHub Actions workflow (`.github/workflows/ci.yml`)
  ```yaml
  name: CI
  
  on: [push, pull_request]
  
  jobs:
    test:
      runs-on: ubuntu-latest
      
      services:
        postgres:
          image: postgres:16-alpine
          env:
            POSTGRES_USER: test
            POSTGRES_PASSWORD: test
            POSTGRES_DB: test_db
          ports:
            - 5432:5432
          options: >-
            --health-cmd pg_isready
            --health-interval 10s
            --health-timeout 5s
            --health-retries 5
      
      steps:
        - uses: actions/checkout@v3
        
        - name: Set up Node.js
          uses: actions/setup-node@v3
          with:
            node-version: '18.x'
            cache: 'npm'
            
        - name: Install dependencies
          run: npm ci
          
        - name: Lint
          run: npm run lint
          
        - name: Test
          run: npm test
          env:
            NODE_ENV: test
            DATABASE_URL: postgresql://test:test@localhost:5432/test_db
  ```

## Documentation

### Project README
- [ ] Create comprehensive `README.md` with:
  - Project overview
  - Features
  - Installation instructions
  - Usage examples
  - Development setup
  - Testing
  - Contributing guidelines
  - License

### Development Setup
- [ ] Create `docs/development-setup.md` with:
  - Prerequisites
  - Environment setup
  - Database configuration
    ```
    Host: localhost
    Port: 5432
    Database: ai_workflow_db
    User: user
    Password: password
    ```
  - Running locally
  - Docker instructions
  - Testing guidelines
  - Common troubleshooting

### Contribution Guidelines
- [ ] Create `CONTRIBUTING.md` with:
  - Code style and standards
  - Branching strategy
  - Testing requirements
  - Commit message format
  - Pull request process

### API Documentation
- [ ] Set up JSDoc
  ```bash
  npm install --save-dev jsdoc
  ```
- [ ] Create `jsdoc.json`
  ```json
  {
    "source": { "include": ["nodes", "services", "helpers", "utils"] },
    "opts": { "destination": "./docs/api", "recurse": true }
  }
  ```
- [ ] Add docs script to `package.json`
  ```json
  "scripts": {
    "docs": "jsdoc -c jsdoc.json"
  }
  ```
- [ ] Generate initial API documentation
  ```bash
  npm run docs
  ```

### Architecture Decision Records (ADR)
- [ ] Create `docs/adr` directory
- [ ] Add ADR template (`0000-template.md`)
  ```markdown
  # ADR-XXXX: Title
  
  ## Date
  
  ## Status
  Proposed / Accepted / Deprecated / Superseded
  
  ## Context
  Explain context, problem statement clearly.
  
  ## Decision
  Clearly define the decision made.
  
  ## Consequences
  List clearly any potential implications, benefits, or trade-offs.
  ```
- [ ] Create initial ADR for major architectural decisions

## Verification
- [ ] Verify all checks pass on GitHub Actions
- [ ] Confirm ESLint and Prettier enforce code style
- [ ] Ensure test coverage meets thresholds
- [ ] Validate Docker environment setup
- [ ] Confirm documentation is complete and accurate
