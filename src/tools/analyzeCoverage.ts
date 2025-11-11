import { exec } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

/**
 * Runs Vitest with coverage enabled and returns a JSON object describing uncovered lines.
 */
export async function analyzeCoverage(projectRoot: string): Promise<any> {
  const vitestCmd = 'npx vitest run --coverage --reporter=json';
  return new Promise((resolve, reject) => {
    exec(vitestCmd, { cwd: projectRoot }, async (error, stdout, stderr) => {
      if (error) {
        return reject({ error: error.message, stderr });
      }
      // Vitest writes coverage JSON to ./coverage/coverage-final.json by default (c8)
      const coveragePath = path.join(projectRoot, 'coverage', 'coverage-final.json');
      try {
        const raw = await fs.readFile(coveragePath, 'utf-8');
        const coverage = JSON.parse(raw);
        // Find uncovered statements/branches/functions
        const uncovered: any[] = [];
        for (const file of Object.keys(coverage)) {
          const data = coverage[file];
          // statements
          for (const [stmtId, count] of Object.entries(data.s || {})) {
            if (count === 0) {
              uncovered.push({ file, type: 'statement', id: stmtId });
            }
          }
          // branches
          for (const [branchId, counts] of Object.entries(data.b || {})) {
            if ((counts as number[]).some(c => c === 0)) {
              uncovered.push({ file, type: 'branch', id: branchId });
            }
          }
          // functions
          for (const [fnId, count] of Object.entries(data.f || {})) {
            if (count === 0) {
              uncovered.push({ file, type: 'function', id: fnId });
            }
          }
        }
        resolve({ uncovered, coveragePath });
      } catch (readErr) {
        reject({ error: 'Failed to read coverage file', details: readErr });
      }
    });
  });
}
