import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

/**
 * Generates coverage diff between current branch and base branch
 */
export async function generateCoverageDiff(baseBranch = 'main'): Promise<any> {
  // Store current branch coverage JSON
  execSync('npx vitest run --coverage --reporter=json', { stdio: 'inherit' });
  const currentCov = await fs.readJSON(path.join(process.cwd(), 'coverage', 'coverage-final.json'));

  // Checkout base branch, run coverage again
  try {
    execSync(`git checkout ${baseBranch}`);
    execSync('npx vitest run --coverage --reporter=json');
    const baseCov = await fs.readJSON(path.join(process.cwd(), 'coverage', 'coverage-final.json'));

    // Switch back to previous branch
    execSync('git checkout -'); // returns you to the branch you were on

    const diff = computeDiff(baseCov, currentCov);
    return { success: true, diff };
  } catch (error) {
    // If checkout fails, return current coverage only
    execSync('git checkout -');
    return { 
      success: false, 
      error: 'Failed to compare with base branch. Ensure you have git history and the base branch exists.',
      currentCoverage: currentCov 
    };
  }
}

function computeDiff(base: any, current: any) {
  const files = new Set([...Object.keys(base), ...Object.keys(current)]);
  const result: Record<string, { 
    baseStatements: number; 
    currentStatements: number;
    statementChange: number;
    baseBranches?: number;
    currentBranches?: number;
    branchChange?: number;
  }> = {};

  for (const f of files) {
    const baseS = (base[f]?.s ?? {});
    const curS = (current[f]?.s ?? {});
    
    // Sum covered statements
    const baseCovered = Object.values(baseS).reduce((a, b) => a + (b as number), 0);
    const curCovered = Object.values(curS).reduce((a, b) => a + (b as number), 0);
    
    const baseB = (base[f]?.b ?? {});
    const curB = (current[f]?.b ?? {});

    result[f] = { 
      baseStatements: baseCovered, 
      currentStatements: curCovered,
      statementChange: curCovered - baseCovered,
      baseBranches: Object.values(baseB).reduce((a, b) => a + (b as number), 0),
      currentBranches: Object.values(curB).reduce((a, b) => a + (b as number), 0),
      branchChange: Object.values(curB).reduce((a, b) => a + (b as number), 0) - 
                   Object.values(baseB).reduce((a, b) => a + (b as number), 0)
    };
  }
  
  return result;
}

/**
 * Generates SVG badge for coverage change
 */
export async function generateCoverageBadge(): Promise<string> {
  const diffResult = await generateCoverageDiff();
  
  if (!diffResult.success) {
    return generateSimpleBadge('coverage', 'N/A', 'lightgrey');
  }

  // Compute overall statement coverage change
  let baseTotal = 0, curTotal = 0;
  
  for (const fileData of Object.values(diffResult.diff)) {
    baseTotal += fileData.baseStatements;
    curTotal += fileData.currentStatements;
  }
  
  const change = baseTotal ? ((curTotal - baseTotal) / baseTotal) * 100 : 0;
  const color = change >= 0 ? 'brightgreen' : 'red';
  const label = `coverage Δ ${change.toFixed(1)}%`;
  
  return generateSimpleBadge('coverage', label, color);
}

function generateSimpleBadge(label: string, message: string, color: string): string {
  const encodedLabel = encodeURIComponent(label);
  const encodedMessage = encodeURIComponent(message);
  
  // Simple SVG badge using shields.io style
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(80, message.length * 7)}" height="20">
    <rect width="${Math.max(80, message.length * 7)}" height="20" fill="#555"/>
    <text x="${Math.max(40, message.length * 3.5)}" y="14" text-anchor="middle" fill="#fff" font-size="12">${message}</text>
  </svg>`;
}

// Plugin export
export default {
  name: 'coverage-diff',
  router(app: any) {
    app.post('/coverage-diff', async (req: any, res: any) => {
      const { baseBranch = 'main' } = req.body;
      
      try {
        const diffResult = await generateCoverageDiff(baseBranch);
        
        if (diffResult.success) {
          res.json({ 
            success: true, 
            diff: diffResult.diff,
            summary: generateDiffSummary(diffResult.diff)
          });
        } else {
          res.status(400).json({ 
            success: false, 
            error: diffResult.error,
            currentCoverage: diffResult.currentCoverage 
          });
        }
      } catch (e) {
        console.error('Coverage diff error:', e);
        res.status(500).json({ 
          success: false, 
          error: (e as any).message || 'Failed to generate coverage diff' 
        });
      }
    });

    app.get('/coverage-badge.svg', async (_req: any, res: any) => {
      try {
        const svg = await generateCoverageBadge();
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
      } catch (e) {
        console.error('Badge generation error:', e);
        res.status(500).send('Error generating badge');
      }
    });
  },
};

function generateDiffSummary(diff: any) {
  let totalFiles = Object.keys(diff).length;
  let improvedFiles = 0;
  let degradedFiles = 0;
  let totalStatementChange = 0;

  for (const fileData of Object.values(diff)) {
    if (fileData.statementChange > 0) improvedFiles++;
    if (fileData.statementChange < 0) degradedFiles++;
    totalStatementChange += fileData.statementChange;
  }

  return {
    totalFiles,
    improvedFiles,
    degradedFiles,
    unchangedFiles: totalFiles - improvedFiles - degradedFiles,
    totalStatementChange
  };
}