# Vitest Coverage MCP Server

## Overview
This repository provides an **MCP (Model Context Protocol) server** that helps you achieve **100% test coverage** for a React Vite project using **Vitest**.

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
