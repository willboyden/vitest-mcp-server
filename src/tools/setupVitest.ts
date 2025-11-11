import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';

/**
 * Installs Vitest, React Testing Library and creates a basic vitest.config.ts if missing.
 */
export async function setupVitest(projectRoot: string): Promise<any> {
  const vitestConfigPath = path.join(projectRoot, 'vitest.config.ts');

  // Ensure vitest config exists
  if (!(await fs.pathExists(vitestConfigPath))) {
    const defaultConfig = `import { defineConfig } from 'vitest/config';\n` +
      `import react from '@vitejs/plugin-react';\n\n` +
      `export default defineConfig({\n  plugins: [react()],\n  test: {\n    globals: true,\n    environment: 'jsdom',\n    setupFiles: './src/setupTests.ts',\n    coverage: {\n      provider: 'c8',\n      reporter: ['text','json','html'],\n      all: true,\n      statements: 100,\n      branches: 100,\n      functions: 100,\n      lines: 100\n    }\n  }\n});`;
    await fs.writeFile(vitestConfigPath, defaultConfig);
  }

  // Ensure src/setupTests.ts exists (basic version)
  const setupPath = path.join(projectRoot, 'src', 'setupTests.ts');
  if (!(await fs.pathExists(setupPath))) {
    await fs.ensureDir(path.dirname(setupPath));
    await fs.writeFile(setupPath, "import '@testing-library/jest-dom';\n");
  }

  // Install required dev dependencies via npm (or yarn if present)
  const pkgLock = path.join(projectRoot, 'package-lock.json');
  const useYarn = await fs.pathExists(path.join(projectRoot, 'yarn.lock'));
  const installCmd = useYarn
    ? 'yarn add -D vitest @testing-library/react @vitejs/plugin-react'
    : 'npm install --save-dev vitest @testing-library/react @vitejs/plugin-react';

  return new Promise((resolve, reject) => {
    exec(installCmd, { cwd: projectRoot }, (err, stdout, stderr) => {
      if (err) return reject({ error: err.message, stderr });
      resolve({ message: 'Vitest setup complete', stdout });
    });
  });
}
