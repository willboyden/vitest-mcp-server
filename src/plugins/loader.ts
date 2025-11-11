import fs from 'fs-extra';
import path from 'path';

type ToolModule = {
  name: string;
  router: (app: any) => void; // Express app
};

export async function loadPlugins(app: any, pluginsDir = path.join(__dirname, '..', 'tools')) {
  if (!(await fs.pathExists(pluginsDir))) {
    console.log(`Plugins directory ${pluginsDir} does not exist`);
    return;
  }

  const files = await fs.readdir(pluginsDir);
  
  for (const file of files) {
    if (!file.endsWith('.ts') || file === 'index.ts' || file.startsWith('.')) continue;
    
    const fullPath = path.join(pluginsDir, file);
    
    try {
      // Dynamic import - in Node ESM you can use createRequire or top-level await
      const module = await import(fullPath);
      
      if (module.default && typeof module.default.router === 'function') {
        console.log(`Loading plugin: ${module.default.name}`);
        
        // Call the router to register routes
        module.default.router(app);
      } else {
        console.warn(`Plugin ${file} does not export a valid default module with router function`);
      }
    } catch (error) {
      console.error(`Failed to load plugin ${file}:`, error);
    }
  }
}

export { ToolModule };