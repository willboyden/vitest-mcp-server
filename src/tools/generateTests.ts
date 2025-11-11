import path from 'path';
import fs from 'fs-extra';
import glob from 'glob';

/**
 * Generates basic Vitest test files for uncovered React components.
 * It creates a __tests__ directory mirroring the source structure and adds
 * a simple render test using @testing-library/react.
 */
export async function generateTests(projectRoot: string, uncoveredFiles: string[]): Promise<any> {
  const testPromises = uncoveredFiles.map(async (filePath) => {
    // Resolve absolute path
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
    const ext = path.extname(absPath);
    if (!['.tsx', '.jsx', '.js', '.ts'].includes(ext)) {
      return null; // Skip non-JS/TS files
    }
    const relative = path.relative(projectRoot, absPath);
    // Determine component name (file base without extension)
    const componentName = path.basename(absPath, ext);
    // Determine test file location
    const testDir = path.join(projectRoot, '__tests__', path.dirname(relative));
    await fs.ensureDir(testDir);
    const testFile = path.join(testDir, `${componentName}.test${ext}`);

    // If test already exists, skip to avoid overwriting user tests
    if (await fs.pathExists(testFile)) {
      return null;
    }

    // Basic test template using React Testing Library
    const importPath = path.relative(testDir, absPath).replace(/\\/g, '/');
    const template = `import { render } from '@testing-library/react';\n` +
      `import ${componentName} from '${importPath.startsWith('.') ? importPath : './' + importPath}';\n\n` +
      `test('renders ${componentName} without crashing', () => {\n` +
      `  const { container } = render(<${componentName} />);\n` +
      `  expect(container).toBeTruthy();\n` +
      `});\n`;
    await fs.writeFile(testFile, template);
    return testFile;
  });

  const results = await Promise.all(testPromises);
  return results.filter(Boolean);
}
