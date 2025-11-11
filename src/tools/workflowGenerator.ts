import fs from 'fs-extra';
import path from 'path';

/**
 * Generates GitHub Actions workflow for CI/CD
 */
export async function generateGitHubWorkflow(projectName = 'react-vite-app'): Promise<string> {
  const workflowDir = path.join(process.cwd(), '.github', 'workflows');
  await fs.ensureDir(workflowDir);
  
  const workflow = `name: Vitest Coverage CI

on:
  push:
    branches: [ main, develop ]
  pull_request:

jobs:
  coverage:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Use Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run Vitest with coverage
        run: npx vitest run --coverage
        
      - name: Upload coverage reports to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: \${{ secrets.CODECOV_TOKEN }}
          
      - name: Upload coverage artifacts
        uses: actions/upload-artifact@v3
        with:
          name: coverage-report-\${{ matrix.node-version }}
          path: coverage/
          
      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: 5monkeys/cobertura-action@master
        with:
          path: coverage/coverage-final.xml
          minimum_coverage: 100
          fail_below_threshold: true`;

  const workflowPath = path.join(workflowDir, 'vitest-coverage.yml');
  await fs.writeFile(workflowPath, workflow.trim());
  
  return workflowPath;
}

/**
 * Generates GitLab CI configuration
 */
export async function generateGitLabWorkflow(projectName = 'react-vite-app'): Promise<string> {
  const gitlabDir = path.join(process.cwd(), '.gitlab-ci.yml');
  
  const config = `stages:
  - install
  - test
  - coverage

variables:
  NODE_VERSION: "18"

cache:
  paths:
    - node_modules/

install:
  stage: install
  image: node:$NODE_VERSION
  script:
    - npm ci
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour

test:
  stage: test
  image: node:$NODE_VERSION
  script:
    - npx vitest run --reporter=verbose
  artifacts:
    when: always
    paths:
      - coverage/
    reports:
      junit: coverage/junit.xml

coverage:
  stage: coverage
  image: node:$NODE_VERSION
  script:
    - npx vitest run --coverage
  coverage: '/Lines\s*:\s*(\d+.\d+%)/'
  artifacts:
    paths:
      - coverage/
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/coverage-final.xml`;

  await fs.writeFile(gitlabDir, config.trim());
  
  return gitlabDir;
}

/**
 * Generates comprehensive CI configuration based on platform
 */
export async function generateCIConfig(platform: 'github' | 'gitlab' = 'github', projectName?: string): Promise<any> {
  try {
    let configPath: string;
    
    if (platform === 'github') {
      configPath = await generateGitHubWorkflow(projectName);
    } else if (platform === 'gitlab') {
      configPath = await generateGitLabWorkflow(projectName);
    } else {
      throw new Error('Unsupported platform. Use "github" or "gitlab".');
    }

    // Also generate a README section explaining the CI setup
    const readmeSection = generateCIReadme(platform, projectName);
    
    return {
      success: true,
      configPath,
      readmeSection,
      message: `Generated ${platform} CI configuration`
    };
    
  } catch (error) {
    return {
      success: false,
      error: (error as any).message || 'Failed to generate CI configuration'
    };
  }
}

function generateCIReadme(platform: string, projectName?: string): string {
  const name = projectName || 'your-project';
  
  if (platform === 'github') {
    return `## GitHub Actions CI

This project uses GitHub Actions for continuous integration:

- **Triggers**: Push to \`main\`/\`develop\` branches and pull requests
- **Node versions**: Tests run on Node.js 18.x and 20.x
- **Coverage**: Enforces 100% coverage threshold
- **Artifacts**: Coverage reports are uploaded as build artifacts

### Setup Instructions

1. The workflow file is automatically generated at \`.github/workflows/vitest-coverage.yml\`
2. (Optional) Add a \`CODECOV_TOKEN\` secret to your repository for enhanced coverage reporting
3. Push to trigger the workflow

### Coverage Badge

Add this badge to your README:
\`\`\`markdown
![Coverage](https://github.com/your-username/${name}/workflows/Vitest%20Coverage%20CI/badge.svg)
\`\`\`
`;
  } else {
    return `## GitLab CI

This project uses GitLab CI for continuous integration:

- **Stages**: install → test → coverage
- **Node version**: Tests run on Node.js 18.x
- **Coverage**: Reports coverage in job output and artifacts
- **Artifacts**: Coverage reports are preserved for download

### Setup Instructions

1. The configuration is automatically generated at \`.gitlab-ci.yml\`
2. Commit and push to trigger pipeline
3. View coverage reports in job artifacts

### Coverage Badge

Add this badge to your README:
\`\`\`markdown
![Coverage](https://gitlab.com/your-username/${name}/-/jobs/artifacts/main/raw/coverage/badge.svg?job=coverage)
\`\`\`
`;
  }
}

// Plugin export
export default {
  name: 'ci-generator',
  router(app: any) {
    app.post('/generate-workflow', async (req: any, res: any) => {
      const { platform = 'github', projectName } = req.body;
      
      try {
        const result = await generateCIConfig(platform, projectName);
        
        if (result.success) {
          res.json({
            success: true,
            ...result,
            instructions: result.readmeSection
          });
        } else {
          res.status(400).json(result);
        }
      } catch (e) {
        console.error('Workflow generation error:', e);
        res.status(500).json({ 
          success: false, 
          error: (e as any).message || 'Failed to generate workflow' 
        });
      }
    });

    // Generate both GitHub and GitLab configurations
    app.post('/generate-all-workflows', async (req: any, res: any) => {
      const { projectName } = req.body;
      
      try {
        const githubResult = await generateCIConfig('github', projectName);
        const gitlabResult = await generateCIConfig('gitlab', projectName);
        
        res.json({
          success: true,
          github: {
            ...githubResult,
            instructions: generateCIReadme('github', projectName)
          },
          gitlab: {
            ...gitlabResult,
            instructions: generateCIReadme('gitlab', projectName)
          }
        });
      } catch (e) {
        console.error('Multi-workflow generation error:', e);
        res.status(500).json({ 
          success: false, 
          error: (e as any).message || 'Failed to generate workflows' 
        });
      }
    });

    // Health check for CI generation
    app.get('/ci-health', async (_req: any, res: any) => {
      const checks = {
        githubActions: await checkGitHubSetup(),
        gitlabCI: await checkGitLabSetup()
      };
      
      res.json({
        status: 'healthy',
        checks,
        message: 'CI generation is ready'
      });
    });
  },
};

async function checkGitHubSetup() {
  const workflowPath = path.join(process.cwd(), '.github', 'workflows');
  return {
    available: await fs.pathExists(workflowPath),
    workflowsDir: workflowPath
  };
}

async function checkGitLabSetup() {
  const gitlabConfig = path.join(process.cwd(), '.gitlab-ci.yml');
  return {
    available: await fs.pathExists(gitlabConfig),
    configFile: gitlabConfig
  };
}