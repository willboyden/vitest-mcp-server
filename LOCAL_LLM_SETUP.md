# Local LLM Setup Guide

This guide helps you set up local LLM providers for the Vitest Coverage MCP Server.

## Quick Setup Options

### Option 1: LM Studio (Easiest)

**Why choose:** User-friendly GUI, automatic model downloads
1. Download from [lmstudio.ai](https://lmstudio.ai/)
2. Search and download a model (e.g., "Llama 2 7B Chat")
3. Go to "Local Server" tab
4. Click "Start Server"
5. Note the port (default: 1234)

**Configure:**
```bash
export LLM_PROVIDER=lmstudio
```

### Option 2: Ollama (Most Popular)

**Why choose:** Simple CLI, many pre-built models
1. Install: `curl -fsSL https://ollama.ai/install.sh | sh`
2. Pull a model: `ollama pull llama2`
3. Server starts automatically on port 11434

**Configure:**
```bash
export LLM_PROVIDER=ollama
```

### Option 3: llama.cpp (Best Performance)

**Why choose:** Highest performance, CPU/GPU optimized
1. Build from source or download release
2. Convert your model to GGUF format
3. Start server: `./server -m model.gguf`

**Configure:**
```bash
export LLM_PROVIDER=llamacpp
```

### Option 4: MLX (Apple Silicon Only)

**Why choose:** Optimized for M1/M2 chips
1. Install MLX: Follow [Apple's guide](https://ml-explore.github.io/mlx/build/)
2. Install Python package: `pip install mlx-lm`
3. Download compatible model

**Configure:**
```bash
export LLM_PROVIDER=mlx
```

## Recommended Models by Use Case

| Provider | Model Name | Size | Best For |
|----------|-----------|------|----------|
| **LM Studio** | CodeLlama-7b-Instruct | 3.8GB | Test generation |
| **Ollama** | codellama:7b | 3.8GB | Code-focused tasks |
| **llama.cpp** | mistral-7b-instruct-v0.1.Q4_0.gguf | 4.1GB | Balanced performance |
| **MLX** | mlx-community/Llama-2-7b-chat-hf-4bit | ~2GB | Apple Silicon |

## Testing Your Setup

After configuring your LLM provider, test the connection:

```bash
# Start the MCP server
npm run dev

# Check LLM health (in another terminal)
curl http://localhost:3000/ai-health
```

Expected response:
```json
{
  "status": "healthy",
  "provider": "lmstudio", // or ollama, llamacpp, mlx
  "model": "llama-2-7b-chat",
  "message": "LLM provider is ready"
}
```

## Troubleshooting

### Common Issues and Solutions

#### Connection Refused
- **Problem:** `ECONNREFUSED` error
- **Solution:** Ensure your LLM server is running on the correct port

#### Model Not Found
- **Problem:** 404 or model not available error  
- **Solution:** Verify model name and ensure it's downloaded/installed

#### Out of Memory
- **Problem:** Server crashes or runs out of memory
- **Solution:** Use smaller models (7B instead of 13B+) or quantized versions

#### Slow Generation
- **Problem:** Very slow test generation
- **Solution:** 
  - Use GPU acceleration if available
  - Try smaller models
  - Increase system RAM

### Debug Commands

```bash
# Test LM Studio directly
curl http://localhost:1234/v1/models

# Check Ollama models
ollama list

# Test llama.cpp server
curl http://localhost:8080/health

# Verify MLX installation  
python3 -c "import mlx_lm; print('OK')"
```

## Performance Tips

1. **Use Quantized Models** - Q4_0, Q5_0 variants use less memory
2. **Enable GPU Acceleration** - CUDA for NVIDIA, Metal for Apple Silicon
3. **Close Unnecessary Applications** - Free up system resources
4. **Use Smaller Context Windows** - Reduce maxTokens in config

## Configuration Examples

### mcp.config.json for LM Studio
```json
{
  "llmProvider": {
    "type": "lmstudio",
    "baseUrl": "http://localhost:1234", 
    "model": "llama-2-7b-chat",
    "maxTokens": 1500,
    "temperature": 0.1
  }
}
```

### mcp.config.json for Ollama
```json
{
  "llmProvider": {
    "type": "ollama",
    "baseUrl": "http://localhost:11434",
    "model": "codellama:7b", 
    "maxTokens": 1500,
    "temperature": 0.1
  }
}
```

## Next Steps

Once your LLM is working:

1. **Run the demo workflow:** `./scripts/demo-workflow.sh /path/to/your/project`
2. **Generate AI tests:** Use the `/ai-generate-tests` endpoint
3. **Monitor performance:** Check server logs for generation times

Happy testing! 🚀