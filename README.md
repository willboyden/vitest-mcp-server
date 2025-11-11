# Vitest Coverage MCP Server v2.0

## 🚀 Overview

A powerful **Model Context Protocol (MCP) server** that automatically achieves **100% Vitest coverage** for React Vite projects. This enhanced version includes AI-powered test generation, performance profiling, CI/CD workflow generation, and comprehensive coverage analysis.

## ✨ Features

### Core Functionality
- **🔧 Automatic Vitest Setup** - Installs and configures Vitest with 100% coverage thresholds
- **📊 Coverage Analysis** - Runs detailed coverage analysis and identifies uncovered code
- **🧪 Test Generation** - Creates comprehensive test files for React components

### 🆕 Advanced Features (v2.0)
- **🤖 AI-Powered Test Writer** - Uses OpenAI GPT to generate high-quality, context-aware tests
- **📈 Coverage Diff & Badges** - Generates SVG badges showing coverage changes between branches
- **⚡ Test Performance Profiler** - Identifies slow tests and provides optimization recommendations
- **🔄 CI/CD Workflow Generator** - Creates GitHub Actions and GitLab CI configurations
- **🏗️ Plugin Architecture** - Extensible system for adding new tools dynamically
- **📝 Structured Logging** - Pino-based logging with request tracing and error handling
- **🐳 Docker Support** - Complete containerization with Redis for caching
- **📱 Enhanced API** - Comprehensive RESTful endpoints with detailed health checks

## 🛠️ Installation

### Quick Start (Development)
```bash
git clone <repository-url>
cd vitest-mcp-server
npm install
npm run dev  # Starts server on http://localhost:3000
```

### Docker Setup (Recommended)
```bash
# Build and run with docker-compose
docker-compose up --build

# Or build manually
docker build -t vitest-mcp-server .
docker run -p 3000:3000 -v $(pwd)/projects:/app/projects vitest-mcp-server
```

### Environment Variables
```bash
# Required for AI features (optional)
export OPENAI_API_KEY=your_openai_api_key

# Server configuration
export PORT=3000
export LOG_LEVEL=info
export NODE_ENV=production
```

## 📚 API Documentation

### Health & Status Endpoints
- `GET /health` - Detailed server health check with configuration info
- `GET /api` - API information and available endpoints

### Core Tool Endpoints (via Plugin System)
- `POST /setup-vitest` - Initialize Vitest in a project
- `POST /analyze-coverage` - Run coverage analysis and identify gaps
- `POST /generate-tests` - Create basic test files for uncovered components

### 🆕 Advanced Tool Endpoints
- `POST /ai-generate-tests` - Generate AI-powered tests (requires OpenAI API key)
- `POST /coverage-diff` - Compare coverage between branches
- `GET /coverage-badge.svg` - Generate SVG badge for coverage changes
- `GET /profile-tests` - Analyze test performance and identify bottlenecks
- `POST /generate-workflow` - Create CI/CD workflow configurations

### AI-Specific Endpoints
- `GET /ai-health` - Check OpenAI API configuration and connectivity

## 🎯 Usage Examples

### Basic Workflow
```bash
# 1. Setup Vitest in your project
curl -X POST http://localhost:3000/setup-vitest \
  -H "Content-Type: application/json" \
  -d '{"projectPath":"/path/to/your/react-vite-project"}'

# 2. Analyze current coverage
curl -X POST http://localhost:3000/analyze-coverage \
  -H "Content-Type: application/json" \
  -d '{"projectPath":"/path/to/your/react-vite-project"}'

# 3. Generate tests for uncovered files
curl -X POST http://localhost:3000/generate-tests \
  -H "Content-Type: application/json" \
  -d '{"projectPath":"/path/to/your/react-vite-project"}'
```

### Advanced AI-Powered Workflow
```bash
# Generate high-quality tests using OpenAI
curl -X POST http://localhost:3000/ai-generate-tests \
  -H "Content-Type: application/json" \
  -d '{
    "projectPath": "/path/to/your/react-vite-project",
    "uncoveredFiles": [
      {"file": "src/components/Button.tsx", "type": "statement"},
      {"file": "src/pages/Home.tsx", "type": "function"}
    ]
  }'
```

### Coverage Analysis & Badges
```bash
# Generate coverage diff between current and main branch
curl -X POST http://localhost:3000/coverage-diff \
  -H "Content-Type: application/json" \
  -d '{"baseBranch": "main"}'

# Get coverage change badge (SVG)
curl http://localhost:3000/coverage-badge.svg > coverage-delta.svg
```

### Performance Profiling
```bash
# Analyze test performance and get recommendations
curl http://localhost:3000/profile-tests | jq '.recommendations'
```

### CI/CD Workflow Generation
```bash
# Generate GitHub Actions workflow
curl -X POST http://localhost:3000/generate-workflow \
  -H "Content-Type: application/json" \
  -d '{"platform": "github", "projectName": "my-react-app"}'
```

## 🔧 Configuration

### mcp.config.json
The server supports optional configuration via `mcp.config.json`:

```json
{
  "projectRoot": "/Volumes/Ddrive/LMStudioOutput/vitest-mcp-server",
  "port": 3000,
  "logLevel": "info",
  "coverageThresholds": {
    "statements": 100,
    "branches": 100,
    "functions": 100,
    "lines": 100
  },
  "openaiKeyEnvVar": "OPENAI_API_KEY",
  "corsOrigins": ["http://localhost:3000"],
  "aiModel": {
    "name": "gpt-4o-mini",
    "temperature": 0.2,
    "maxTokens": 2000
  }
}
```

## 🏗️ Plugin Architecture

The server uses a dynamic plugin system. To add new tools:

1. Create a new file in `src/tools/`
2. Export a default object with:
   ```typescript
   export default {
     name: 'my-tool-name',
     router(app: Express) {
       app.post('/my-endpoint', async (req, res) => {
         // Your tool logic here
       });
     }
   };
   ```
3. The tool will be automatically loaded and registered

## 📊 Coverage Analysis Features

### Detailed Reporting
- **Uncovered Statements** - Line-by-line statement coverage analysis
- **Branch Coverage** - Conditional branch analysis
- **Function Coverage** - Function-level coverage metrics
- **File-Level Analysis** - Per-file coverage breakdown

### Visual Tools
- **HTML Coverage Reports** - Served at `/coverage` endpoint
- **SVG Badges** - Dynamic coverage change badges
- **JSON Reports** - Machine-readable coverage data

## 🤖 AI Test Generation

### Features
- **Context-Aware** - Analyzes component structure and props
- **High-Quality Tests** - Uses React Testing Library best practices
- **Edge Case Coverage** - Automatically handles common scenarios
- **Snapshot Testing** - Includes snapshot tests when appropriate

### Requirements
- OpenAI API key in environment variables
- Valid React component files (.tsx/.jsx)
- Project structure that allows relative imports

## ⚡ Performance Analysis

### Test Profiling
- **Execution Time Tracking** - Per-test duration analysis
- **Bottleneck Identification** - Finds slow-running tests
- **Optimization Recommendations** - Suggests improvements
- **Suite Analysis** - Groups by test suite for organization

### Recommendations Include
- Tests taking too long (>2s)
- Candidates for parallelization
- Missing assertions in render-only tests
- Potential test splitting opportunities

## 🔄 CI/CD Integration

### Supported Platforms
- **GitHub Actions** - Complete workflow with coverage reporting
- **GitLab CI** - Multi-stage pipeline configuration

### Generated Workflows Include
- Node.js matrix testing (18.x, 20.x)
- Automated coverage reporting to Codecov
- Artifact upload for coverage reports
- PR comments with coverage information
- 100% coverage threshold enforcement

## 🐳 Docker Configuration

### Services Included
- **MCP Server** - Main application container
- **Redis Stack** - Caching and session management (optional)
- **RedisInsight** - Database visualization tool

### Volumes
- `mcp_data` - Application data persistence
- `redis_data` - Redis data persistence
- `./projects:/app/projects:ro` - Project analysis (mounted read-only)

## 📈 Monitoring & Logging

### Structured Logging
- **Pino-based** - JSON-structured logs with timestamps
- **Request Tracing** - All HTTP requests logged with duration
- **Error Tracking** - Stack traces and context for debugging
- **Configurable Levels** - debug, info, warn, error

### Health Monitoring
- Uptime tracking
- Feature availability checks
- Configuration validation
- External service connectivity (OpenAI, Redis)

## 🧪 Testing the Server

### Demo Workflow Script
```bash
# Run the complete demo workflow
./scripts/demo-workflow.sh /path/to/your/react-project

# With OpenAI API key for AI features
export OPENAI_API_KEY=your_key_here
./scripts/demo-workflow.sh /path/to/your/react-project
```

### Manual Testing
```bash
# Check server health
curl http://localhost:3000/health | jq

# Test basic functionality
npm run setup          # Setup Vitest in current project
npm run coverage       # Run coverage analysis
npm run ai-test        # Generate AI tests (if OpenAI configured)
npm run profile-tests  # Analyze test performance
```

## 🚀 Deployment

### Production Considerations
- Set `NODE_ENV=production`
- Configure proper logging levels
- Set up monitoring and alerting
- Use environment variables for sensitive data
- Consider Redis for caching in high-traffic scenarios

### Scaling
- Stateless design allows horizontal scaling
- Redis can be used for shared caching across instances
- Load balancer friendly with health check endpoints

## 🤝 Contributing

### Development Setup
```bash
git clone <repository>
cd vitest-mcp-server
npm install
npm run dev  # Development mode with hot reload
```

### Adding New Features
1. Create plugin in `src/tools/`
2. Add tests for the plugin
3. Update documentation
4. Submit pull request

## 📝 License

MIT - See LICENSE file for details.

## 🆘 Support

- **Documentation**: This README and inline code comments
- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for questions and ideas

---

**Made with ❤️ for the React testing community**

The server offers three main capabilities:
1. **Setup Vitest** – Installs and configures Vitest, React Testing Library, and the necessary coverage thresholds.
2. **Analyze Coverage** – Runs Vitest with coverage enabled, parses the generated `coverage-final.json`, and reports uncovered statements/branches/functions.
3. **Generate Tests** – Automatically creates skeleton test files for uncovered React components, ensuring that every component has at least a basic render test.

By chaining these endpoints you can iterate towards **full coverage** (100% statements, branches, functions, and lines) enforced by Vitest's `coverage` configuration.

---

## Prerequisites
- Node.js >= 18 (recommended)
- npm or Yarn installed globally
- A React Vite project you want to improve coverage for

---

## Installation
```bash
# Clone this repo (or copy the files into your project)
git clone https://github.com/your-org/vitest-coverage-mcp-server.git
cd vitest-coverage-mcp-server

# Install server dependencies npx npm install   # or `yarn`
```

## Build & Run the Server
```bash
# Compile TypeScript
npm run build

# Start the server (default port 3000)
npm start
```
The server will be reachable at `http://localhost:3000`.

---

## API Endpoints
All endpoints accept **JSON** payloads and return JSON responses.

### 1. Health Check
```
GET /health
```
Response:
```json
{ "status": "ok", "timestamp": "2025-11-11T12:34:56.789Z" }
```

### 2. Setup Vitest
```
POST /setup-vitest
Content-Type: application/json
{
  "projectPath": "/absolute/path/to/your/react-vite-project"
}
```
- Installs `vitest`, `@testing-library/react`, and `@vitejs/plugin-react` if they are missing.
- Generates a default `vitest.config.ts` (if not present) with **100% coverage thresholds**.
- Creates `src/setupTests.ts` for global test setup.

Response (example):
```json
{ "success": true, "result": { "message": "Vitest setup complete", "stdout": "..." } }
```

### 3. Analyze Coverage
```
POST /analyze-coverage
Content-Type: application/json
{
  "projectPath": "/absolute/path/to/your/react-vite-project"
}
```
- Executes `vitest run --coverage`.
- Parses the generated coverage report (`coverage/coverage-final.json`).
- Returns a list of uncovered items.

Response (example):
```json
{
  "success": true,
  "uncovered": [
    {"file":"src/components/Button.tsx","type":"statement","id":"12"},
    {"file":"src/pages/Home.tsx","type":"function","id":"4"}
  ],
  "coveragePath": "/absolute/path/to/project/coverage/coverage-final.json"
}
```

### 4. Generate Tests
```
POST /generate-tests
Content-Type: application/json
{
  "projectPath": "/absolute/path/to/your/react-vite-project",
  "uncoveredFiles": ["src/components/Button.tsx", "src/pages/Home.tsx"]
}
```
- If `uncoveredFiles` is omitted, the server will first call **Analyze Coverage** to discover missing files.
- Creates a `__tests__/` directory mirroring the source tree.
- For each uncovered React component, a basic test file `<Component>.test.tsx` is generated using **React Testing Library**:
  ```tsx
  import { render } from '@testing-library/react';
  import Button from '../../src/components/Button';

  test('renders Button without crashing', () => {
    const { container } = render(<Button />);
    expect(container).toBeTruthy();
  });
  ```
- Existing test files are **not overwritten**.

Response (example):
```json
{ "success": true, "generatedTestFiles": ["/project/__tests__/components/Button.test.tsx"] }
```

---

## Full Workflow to Reach 100% Coverage
```bash
# 1️⃣ Setup Vitest in your project (run once)
curl -X POST http://localhost:3000/setup-vitest \
  -H "Content-Type: application/json" \
  -d '{"projectPath":"/path/to/react-vite-project"}'

# 2️⃣ Run coverage analysis and generate tests repeatedly until no uncovered items remain.
while true; do
  # Analyze coverage & capture uncovered files
  UNCOVERED=$(curl -s -X POST http://localhost:3000/analyze-coverage \
    -H "Content-Type: application/json" \
    -d '{"projectPath":"/path/to/react-vite-project"}' | jq -r '.uncovered[].file')

  if [ -z "$UNCOVERED" ]; then
    echo "✅ All files covered!"
    break
  fi

  # Generate tests for uncovered files
  curl -X POST http://localhost:3000/generate-tests \
    -H "Content-Type: application/json" \
    -d "{\"projectPath\":\"/path/to/react-vite-project\", \"uncoveredFiles\":[$(printf '"%s",
' $UNCOVERED | tr -d '\n')]}"

done
```
The loop will keep creating skeleton tests, re‑running coverage, and stopping once **100%** thresholds are met.

---

## Advanced Customisation
- **Custom Test Templates** – Edit `src/tools/generateTests.ts` to modify the test scaffold.
- **Different Coverage Thresholds** – Change `vitest.config.ts` under the `coverage` section.
- **Authentication / Rate‑Limiting** – Wrap Express routes with middleware if you expose the server publicly.

---

## Troubleshooting
| Issue | Cause | Fix |
|-------|-------|-----|
| `vitest: command not found` | Vitest not installed globally. | Run the `/setup-vitest` endpoint or install manually: `npm i -D vitest`. |
| Coverage report missing | Vitest did not run with `--coverage` or the project uses a custom test runner. | Ensure you call `/analyze-coverage`; it forces `vitest run --coverage`. |
| Generated test fails to compile | Component uses TypeScript features not covered by the basic import. | Manually adjust the generated test or extend `generateTests.ts` to handle props and context. |

---

## License
MIT – Feel free to fork, modify, and integrate into your own CI pipelines.

---

## Contributing
1. Fork the repo
2. Create a feature branch (`git checkout -b feat/xyz`)
3. Add your changes and run `npm test`
4. Submit a Pull Request
