import path from 'path';
import fs from 'fs-extra';
import OpenAI from 'openai';

/**
 * AI-assisted test writer that generates high-quality Vitest tests using OpenAI
 */
export async function generateAITests(projectRoot: string, uncoveredFiles: any[]): Promise<string[]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const generatedFiles: string[] = [];

  for (const uncovered of uncoveredFiles.slice(0, 5)) { // Limit to 5 files per request
    const filePath = path.isAbsolute(uncovered.file) ? uncovered.file : path.join(projectRoot, uncovered.file);
    
    if (!fs.existsSync(filePath)) continue;

    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Determine component name and props from the file content
    const ext = path.extname(filePath);
    const componentName = path.basename(filePath, ext);

    // Generate prompt for the AI
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
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that writes high-quality React component tests.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      });

      const generatedTest = response.choices[0]?.message?.content;
      
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
      console.error(`Failed to generate AI test for ${filePath}:`, error);
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
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ error: 'OpenAI API key not configured' });
      }

      try {
        const files = uncoveredFiles || [];
        const generated = await generateAITests(projectPath, files);
        
        res.json({ 
          success: true, 
          generatedTestFiles: generated,
          message: `Generated ${generated.length} AI-assisted test files`
        });
      } catch (e) {
        console.error('AI Test generation error:', e);
        res.status(500).json({ 
          success: false, 
          error: (e as any).message || 'Failed to generate AI tests' 
        });
      }
    });

    // Health check endpoint for OpenAI configuration
    app.get('/ai-health', async (_req: any, res: any) => {
      const hasApiKey = !!process.env.OPENAI_API_KEY;
      
      if (!hasApiKey) {
        return res.json({ 
          status: 'not_configured', 
          message: 'OpenAI API key not found in environment variables' 
        });
      }

      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        // Simple test to verify API key works
        await openai.models.list();
        
        res.json({ 
          status: 'healthy', 
          message: 'OpenAI API key is valid and working' 
        });
      } catch (error) {
        res.json({ 
          status: 'unhealthy', 
          message: `OpenAI API key validation failed: ${(error as any).message}` 
        });
      }
    });
  },
};