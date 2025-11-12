import path from 'path';
import fs from 'fs-extra';
import { localLLMService } from '../services/localLLMService.js';

/**
 * AI-assisted test writer that supports multiple LLM providers (OpenAI, LM Studio, Ollama, llama.cpp, MLX)
 */
export async function generateAITests(projectRoot: string, uncoveredFiles: any[]): Promise<string[]> {
  const generatedFiles: string[] = [];

  // Initialize the local LLM service
  const isInitialized = await localLLMService.initialize();
  
  if (!isInitialized) {
    throw new Error('LLM service could not be initialized. Please check your configuration.');
  }

  const providerName = localLLMService.getProviderName();
  console.log(`🤖 Using ${providerName} for AI test generation`);

  for (const uncovered of uncoveredFiles.slice(0, 5)) { // Limit to 5 files per request
    const filePath = path.isAbsolute(uncovered.file) ? uncovered.file : path.join(projectRoot, uncovered.file);
    
    if (!fs.existsSync(filePath)) continue;

    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Determine component name and props from the file content
    const ext = path.extname(filePath);
    const componentName = path.basename(filePath, ext);

    // Generate prompt for the LLM
    const prompt = `You are a senior front-end engineer. Write a **Vitest** test file for the React component located at "${filePath}".  
The test must:
1. Import the component with proper relative path.
2. Render it with typical props (use sensible defaults).
3. Check for presence of the main UI element using @testing-library/react.
4. Cover any props that affect rendering (use \`screen.getByRole\`, \`userEvent\`, etc.).
5. Use Vitest matchers and @testing-library/react.
6. Include at least one snapshot test (optional).
7. Handle common edge cases for the component.

Return only the TSX/TS code – no markdown, no explanations.
Component source:
\`\`\`
${fileContent}
\`\`\``;

    try {
      const generatedTest = await localLLMService.generateCompletion(prompt);
      
      if (!generatedTest) continue;

      // Write the generated test file
      const componentDir = path.dirname(filePath);
      const testFileName = `${componentName}.test${ext}`;
      const testsDir = path.join(projectRoot, '__tests__', 'ai-generated');
      
      await fs.ensureDir(testsDir);
      const testFilePath = path.join(testsDir, testFileName);

      // Only write if file doesn't exist to avoid overwriting
      if (!(await fs.pathExists(testFilePath))) {
        await fs.writeFile(testFilePath, generatedTest);
        generatedFiles.push(testFilePath);
      }

    } catch (error) {
      console.error(`Failed to generate AI test for ${filePath} using ${providerName}:`, error);
    }
  }

  return generatedFiles;
}

// Plugin export
export default {
  name: 'ai-test-writer',
  router(app: any) {
    app.post('/ai-generate-tests', async (req: any, res: any) => {
      const { projectPath, uncoveredFiles } = req.body;
      
      if (!projectPath) {
        return res.status(400).json({ error: 'Missing projectPath' });
      }
      
      try {
        const files = uncoveredFiles || [];
        const generated = await generateAITests(projectPath, files);
        
        res.json({ 
          success: true, 
          generatedTestFiles: generated,
          message: `Generated ${generated.length} AI-assisted test files using ${localLLMService.getProviderName()}`
        });
      } catch (e) {
        console.error('AI Test generation error:', e);
        res.status(500).json({ 
          success: false, 
          error: (e as any).message || 'Failed to generate AI tests' 
        });
      }
    });

    // Enhanced health check endpoint for LLM configuration
    app.get('/ai-health', async (_req: any, res: any) => {
      try {
        const isInitialized = await localLLMService.initialize();
        
        if (!isInitialized) {
          return res.json({ 
            status: 'not_configured', 
            message: 'LLM service could not be initialized',
            availableProviders: ['openai', 'lmstudio', 'ollama', 'llamacpp', 'mlx']
          });
        }

        const providerName = localLLMService.getProviderName();
        
        res.json({ 
          status: 'healthy', 
          message: `${providerName} provider is ready`,
          provider: providerName
        });
      } catch (error) {
        res.json({ 
          status: 'unhealthy', 
          message: `LLM service error: ${(error as any).message}`,
          availableProviders: ['openai', 'lmstudio', 'ollama', 'llamacpp', 'mlx']
        });
      }
    });

    // LLM provider configuration endpoint
    app.get('/llm-config', async (_req: any, res: any) => {
      try {
        const isInitialized = await localLLMService.initialize();
        
        if (!isInitialized) {
          return res.json({
            status: 'not_configured',
            message: 'No LLM provider configured'
          });
        }

        const config = {
          status: 'configured',
          provider: localLLMService.getProviderName(),
          instructions: getConfigurationInstructions()
        };

        res.json(config);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: (error as any).message
        });
      }
    });
  },
};

function getConfigurationInstructions(): string {
  return `
## LLM Configuration Options

### OpenAI (Default)
Set environment variables:
- \`LLM_PROVIDER=openai\`
- \`OPENAI_API_KEY=your_key_here\`

### LM Studio
1. Download and run LM Studio from https://lmstudio.ai/
2. Load a local model
3. Start the server (usually on http://localhost:1234)
Set environment variables:
- \`LLM_PROVIDER=lmstudio\`
- \`LMSTUDIO_BASE_URL=http://localhost:1234\`

### Ollama
1. Install Ollama from https://ollama.ai/
2. Pull a model: \`ollama pull llama2\`
3. Start the server (usually on http://localhost:11434)
Set environment variables:
- \`LLM_PROVIDER=ollama\`
- \`OLLAMA_BASE_URL=http://localhost:11434\`

### llama.cpp Server
1. Build and run llama.cpp server with your model
2. Start the server (usually on http://localhost:8080)
Set environment variables:
- \`LLM_PROVIDER=llamacpp\`
- \`LLAMACPP_BASE_URL=http://localhost:8080\`

### MLX (Apple Silicon)
1. Install MLX following Apple’s documentation
2. Ensure your model is accessible locally
Set environment variables:
- \`LLM_PROVIDER=mlx\`
- \`LLM_MODEL=/path/to/your/model\`

Alternatively, configure via mcp.config.json:
{
  "llmProvider": {
    "type": "lmstudio",
    "baseUrl": "http://localhost:1234",
    "model": "local-model"
  }
}
`;
}