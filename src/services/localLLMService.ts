import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

export interface LLMProvider {
  name: string;
  isHealthy(): Promise<boolean>;
  generateCompletion(prompt: string, options?: any): Promise<string>;
  getConfig(): LLMProviderConfig;
}

export interface LLMProviderConfig {
  type: 'openai' | 'lmstudio' | 'ollama' | 'llamacpp' | 'mlx';
  baseUrl?: string;
  model: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
}

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI';
  
  constructor(private config: LLMProviderConfig) {}
  
  async isHealthy(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  async generateCompletion(prompt: string): Promise<string> {
    const response = await axios.post(
      `${this.config.baseUrl}/chat/completions`,
      {
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that writes high-quality React component tests.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.2
      },
      {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      }
    );
    
    return response.data.choices[0]?.message?.content || '';
  }
  
  getConfig(): LLMProviderConfig {
    return this.config;
  }
}

export class LMStudioProvider implements LLMProvider {
  name = 'LM Studio';
  
  constructor(private config: LLMProviderConfig) {}
  
  async isHealthy(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/v1/models`);
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  async generateCompletion(prompt: string): Promise<string> {
    const response = await axios.post(
      `${this.config.baseUrl}/v1/chat/completions`,
      {
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that writes high-quality React component tests.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.2
      }
    );
    
    return response.data.choices[0]?.message?.content || '';
  }
  
  getConfig(): LLMProviderConfig {
    return this.config;
  }
}

export class OllamaProvider implements LLMProvider {
  name = 'Ollama';
  
  constructor(private config: LLMProviderConfig) {}
  
  async isHealthy(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/tags`);
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  async generateCompletion(prompt: string): Promise<string> {
    const response = await axios.post(
      `${this.config.baseUrl}/api/generate`,
      {
        model: this.config.model,
        prompt: `You are a helpful assistant that writes high-quality React component tests.\n\n${prompt}`,
        stream: false,
        options: {
          num_predict: this.config.maxTokens || 2000,
          temperature: this.config.temperature || 0.2
        }
      }
    );
    
    return response.data.response || '';
  }
  
  getConfig(): LLMProviderConfig {
    return this.config;
  }
}

export class LlamaCppProvider implements LLMProvider {
  name = 'llama.cpp';
  
  constructor(private config: LLMProviderConfig) {}
  
  async isHealthy(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/v1/models`);
      return response.status === 200;
    } catch {
      // llama.cpp server might not have /v1/models endpoint
      try {
        const response = await axios.get(`${this.config.baseUrl}/health`);
        return response.status === 200;
      } catch {
        // Assume it's running if we can reach the base URL
        try {
          await axios.get(`${this.config.baseUrl}`);
          return true;
        } catch {
          return false;
        }
      }
    }
  }
  
  async generateCompletion(prompt: string): Promise<string> {
    const response = await axios.post(
      `${this.config.baseUrl}/v1/chat/completions`,
      {
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that writes high-quality React component tests.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.2
      }
    );
    
    return response.data.choices[0]?.message?.content || '';
  }
  
  getConfig(): LLMProviderConfig {
    return this.config;
  }
}

export class MLXProvider implements LLMProvider {
  name = 'MLX';
  
  constructor(private config: LLMProviderConfig) {}
  
  async isHealthy(): Promise<boolean> {
    // MLX doesn't typically run a server, so we check if the binary exists
    try {
      const { execSync } = require('child_process');
      // Try to check if mlx command exists
      execSync('which python3', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
  
  async generateCompletion(prompt: string): Promise<string> {
    // MLX typically runs locally via Python scripts
    const scriptPath = path.join(process.cwd(), 'mlx_generate.py');
    
    // Create a Python script for MLX generation
    const pythonScript = `
import sys
import json
from mlx_lm import load, generate

# Load model and tokenizer
model, tokenizer = load("${this.config.model}")

prompt = """You are a helpful assistant that writes high-quality React component tests.

${prompt}"""

# Generate response
response = generate(model, tokenizer, prompt=prompt, max_tokens=${this.config.maxTokens || 2000}, temp=${this.config.temperature || 0.2})

print(response)
`;
    
    await fs.writeFile(scriptPath, pythonScript);
    
    try {
      const { execSync } = require('child_process');
      const result = execSync(`python3 ${scriptPath}`, { encoding: 'utf-8' });
      await fs.remove(scriptPath); // Clean up
      return result.trim();
    } catch (error) {
      await fs.remove(scriptPath); // Clean up even on error
      throw new Error(`MLX generation failed: ${error.message}`);
    }
  }
  
  getConfig(): LLMProviderConfig {
    return this.config;
  }
}

export class LocalLLMService {
  private provider: LLMProvider | null = null;
  
  constructor(private configPath?: string) {}
  
  async initialize(): Promise<boolean> {
    const config = await this.loadConfig();
    
    if (!config) {
      console.warn('No LLM configuration found');
      return false;
    }
    
    this.provider = this.createProvider(config);
    
    // Test provider health
    const isHealthy = await this.provider.isHealthy();
    
    if (!isHealthy) {
      console.warn(`${this.provider.name} provider is not healthy`);
      return false;
    }
    
    console.log(`✅ ${this.provider.name} provider initialized successfully`);
    return true;
  }
  
  private async loadConfig(): Promise<LLMProviderConfig | null> {
    try {
      let configData: any;
      
      // Try to load from mcp.config.json first
      if (this.configPath && await fs.pathExists(this.configPath)) {
        configData = await fs.readJSON(this.configPath);
      } else if (await fs.pathExists('mcp.config.json')) {
        configData = await fs.readJSON('mcp.config.json');
      }
      
      if (configData?.llmProvider) {
        return configData.llmProvider;
      }
      
      // Fallback to environment variables
      const providerType = process.env.LLM_PROVIDER || 'openai';
      
      if (providerType === 'lmstudio') {
        return {
          type: 'lmstudio',
          baseUrl: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234',
          model: process.env.LLM_MODEL || 'local-model'
        };
      } else if (providerType === 'ollama') {
        return {
          type: 'ollama',
          baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          model: process.env.LLM_MODEL || 'llama2'
        };
      } else if (providerType === 'llamacpp') {
        return {
          type: 'llamacpp',
          baseUrl: process.env.LLAMACPP_BASE_URL || 'http://localhost:8080',
          model: process.env.LLM_MODEL || 'model.gguf'
        };
      } else if (providerType === 'mlx') {
        return {
          type: 'mlx',
          model: process.env.LLM_MODEL || './models/local-model'
        };
      } else {
        // Default to OpenAI
        return {
          type: 'openai',
          baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
          apiKey: process.env.OPENAI_API_KEY
        };
      }
    } catch (error) {
      console.error('Failed to load LLM configuration:', error);
      return null;
    }
  }
  
  private createProvider(config: LLMProviderConfig): LLMProvider {
    switch (config.type) {
      case 'lmstudio':
        return new LMStudioProvider(config);
      case 'ollama':
        return new OllamaProvider(config);
      case 'llamacpp':
        return new LlamaCppProvider(config);
      case 'mlx':
        return new MLXProvider(config);
      case 'openai':
      default:
        return new OpenAIProvider(config);
    }
  }
  
  async generateCompletion(prompt: string, options?: any): Promise<string> {
    if (!this.provider) {
      throw new Error('LLM service not initialized');
    }
    
    return await this.provider.generateCompletion(prompt, options);
  }
  
  getProviderName(): string {
    return this.provider?.name || 'Unknown';
  }
  
  isInitialized(): boolean {
    return this.provider !== null;
  }
}

// Export singleton instance
export const localLLMService = new LocalLLMService();