import express, { Request, Response } from 'express';
import path from 'path';
import { setupVitest } from './tools/setupVitest';
import { analyzeCoverage } from './tools/analyzeCoverage';
import { generateTests } from './tools/generateTests';

// Simple MCP server using Express. In a real implementation you would use @mcp/core.
const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /setup-vitest
 * Body: { projectPath: string }
 */
app.post('/setup-vitest', async (req: Request, res: Response) => {
  const { projectPath } = req.body;
  if (!projectPath) return res.status(400).json({ error: 'Missing projectPath' });
  try {
    const result = await setupVitest(projectPath);
    res.json({ success: true, result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: (e as any).error || e });
  }
});

/**
 * POST /analyze-coverage
 * Body: { projectPath: string }
 */
app.post('/analyze-coverage', async (req: Request, res: Response) => {
  const { projectPath } = req.body;
  if (!projectPath) return res.status(400).json({ error: 'Missing projectPath' });
  try {
    const result = await analyzeCoverage(projectPath);
    res.json({ success: true, uncovered: result.uncovered, coveragePath: result.coveragePath });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: (e as any).error || e });
  }
});

/**
 * POST /generate-tests
 * Body: { projectPath: string, uncoveredFiles?: string[] }
 * If uncoveredFiles is omitted, the server will run analyzeCoverage first.
 */
app.post('/generate-tests', async (req: Request, res: Response) => {
  const { projectPath, uncoveredFiles } = req.body;
  if (!projectPath) return res.status(400).json({ error: 'Missing projectPath' });
  try {
    let files = uncoveredFiles as string[] | undefined;
    if (!files) {
      const analysis = await analyzeCoverage(projectPath);
      files = analysis.uncovered.map((u: any) => u.file);
    }
    // Deduplicate file list
    const uniqueFiles = Array.from(new Set(files));
    const generated = await generateTests(projectPath, uniqueFiles);
    res.json({ success: true, generatedTestFiles: generated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: (e as any).error || e });
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`MCP Vitest Coverage server listening on http://localhost:${PORT}`);
});
