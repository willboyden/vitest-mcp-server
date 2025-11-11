#!/usr/bin/env bash

# Vitest Coverage MCP Server - Demo Workflow Script
# This script demonstrates a complete workflow from setup to AI-generated tests

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT="${1:-/Volumes/Ddrive/LMStudioOutput/vitest-mcp-server}"  # Default to current directory
BASE="http://localhost:3000"

# Functions for colored output
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if server is running
check_server() {
    log_info "Checking if MCP server is running..."
    
    if curl -s "$BASE/health" > /dev/null 2>&1; then
        log_success "MCP server is running at $BASE"
        
        # Show health status
        echo ""
        log_info "Server Status:"
        curl -s "$BASE/health" | jq '.' || echo "Run 'npm install' to get jq for formatted output"
        echo ""
    else
        log_error "MCP server is not running at $BASE"
        log_info "Please start the server first:"
        echo "  cd $PROJECT"
        echo "  npm install"
        echo "  npm run dev"
        exit 1
    fi
}

# Setup Vitest in the project
setup_vitest() {
    log_info "Setting up Vitest in project: $PROJECT"
    
    response=$(curl -s -X POST "$BASE/setup-vitest" \
        -H "Content-Type: application/json" \
        -d "{\"projectPath\":\"$PROJECT\"}")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        log_success "Vitest setup completed successfully"
    else
        log_warning "Vitest setup response: $response"
    fi
}

# Analyze current coverage
analyze_coverage() {
    log_info "Analyzing current test coverage..."
    
    response=$(curl -s -X POST "$BASE/analyze-coverage" \
        -H "Content-Type: application/json" \
        -d "{\"projectPath\":\"$PROJECT\"}")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        local uncovered_count=$(echo "$response" | jq '.uncovered | length')
        
        if [ "$uncovered_count" -eq 0 ]; then
            log_success "🎉 All files are already covered! No uncovered code found."
        else
            log_info "Found $uncovered_count uncovered items"
            
            # Show some examples
            echo ""
            log_info "Sample uncovered files:"
            echo "$response" | jq -r '.uncovered[] | "\(.type): \(.file)"' | head -5 || true
            echo ""
        fi
        
        # Store uncovered files for later use
        echo "$response" > /tmp/coverage_analysis.json
    else
        log_error "Coverage analysis failed: $response"
        exit 1
    fi
}

# Generate basic tests for uncovered files
generate_basic_tests() {
    log_info "Generating basic tests for uncovered components..."
    
    local uncovered_files=$(jq -r '.uncovered[].file' /tmp/coverage_analysis.json 2>/dev/null | head -5 || echo "")
    
    if [ -z "$uncovered_files" ]; then
        log_info "No uncovered files to generate tests for"
        return 0
    fi
    
    response=$(curl -s -X POST "$BASE/generate-tests" \
        -H "Content-Type: application/json" \
        -d "{\"projectPath\":\"$PROJECT\",\"uncoveredFiles\":[$(echo "$uncovered_files" | jq -R . | paste -sd, -)]}")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        local generated_count=$(echo "$response" | jq '.generatedTestFiles | length')
        
        if [ "$generated_count" -gt 0 ]; then
            log_success "Generated $generated_count basic test files"
            
            # Show generated files
            echo ""
            log_info "Generated test files:"
            echo "$response" | jq -r '.generatedTestFiles[]' || true
        else
            log_info "No new test files were generated (they may already exist)"
        fi
    else
        log_error "Basic test generation failed: $response"
    fi
}

# Generate AI-powered tests (if OpenAI API key is available)
generate_ai_tests() {
    log_info "Attempting to generate AI-powered tests..."
    
    # Check if OpenAI API key is configured
    local ai_health=$(curl -s "$BASE/ai-health")
    
    if echo "$ai_health" | jq -e '.status == "healthy"' > /dev/null 2>&1; then
        log_success "OpenAI API is configured and working"
        
        # Get uncovered files from previous analysis
        local uncovered_files=$(jq -r '.uncovered[] | {file: .file, type: .type}' /tmp/coverage_analysis.json 2>/dev/null | jq -c '.' || echo "")
        
        if [ -n "$uncovered_files" ]; then
            log_info "Generating AI tests for uncovered files..."
            
            response=$(curl -s -X POST "$BASE/ai-generate-tests" \
                -H "Content-Type: application/json" \
                -d "{\"projectPath\":\"$PROJECT\",\"uncoveredFiles\":[$uncovered_files]}")
            
            if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
                local ai_generated_count=$(echo "$response" | jq '.generatedTestFiles | length')
                
                if [ "$ai_generated_count" -gt 0 ]; then
                    log_success "🤖 AI generated $ai_generated_count high-quality test files"
                    
                    echo ""
                    log_info "AI-generated test files:"
                    echo "$response" | jq -r '.generatedTestFiles[]' || true
                else
                    log_info "AI test generation completed but no files were created"
                fi
            else
                log_warning "AI test generation failed: $response"
            fi
        else
            log_info "No uncovered files available for AI test generation"
        fi
    else
        log_warning "OpenAI API is not configured or working: $ai_health"
        log_info "To enable AI features, set OPENAI_API_KEY environment variable"
    fi
}

# Profile test performance
profile_tests() {
    log_info "Analyzing test performance..."
    
    response=$(curl -s "$BASE/profile-tests")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        local summary="$response"
        
        log_success "Test profiling completed"
        echo ""
        log_info "Performance Summary:"
        echo "$summary" | jq '.summary' || echo "$summary"
        
        # Show slowest tests if any
        local slow_count=$(echo "$response" | jq '.slowTests | length')
        
        if [ "$slow_count" -gt 0 ]; then
            echo ""
            log_info "Top 3 slowest tests:"
            echo "$response" | jq -r '.slowestTests[:3][] | "\(.fullName): \(.duration)ms"' || true
        fi
        
    else
        log_warning "Test profiling failed or no tests to profile: $response"
    fi
}

# Generate coverage badge
generate_badge() {
    log_info "Generating coverage change badge..."
    
    # Generate the badge
    local badge_response=$(curl -s "$BASE/coverage-badge.svg")
    
    if [[ $badge_response == *"svg"* ]]; then
        local badge_path="/tmp/coverage-delta.svg"
        echo "$badge_response" > "$badge_path"
        log_success "Coverage badge generated at $badge_path"
        
        # Show the SVG content for debugging
        echo ""
        log_info "Badge preview (first 200 chars):"
        echo "$badge_response" | head -c 200
        echo "..."
    else
        log_warning "Badge generation failed or returned non-SVG content"
    fi
}

# Generate CI workflow
generate_workflow() {
    log_info "Generating GitHub Actions workflow..."
    
    response=$(curl -s -X POST "$BASE/generate-workflow" \
        -H "Content-Type: application/json" \
        -d "{\"platform\":\"github\",\"projectName\":\"vitest-demo\"}")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        log_success "GitHub Actions workflow generated"
        
        local config_path=$(echo "$response" | jq -r '.configPath')
        echo ""
        log_info "Workflow file created at: $config_path"
        
        # Show instructions
        echo ""
        log_info "Setup Instructions:"
        echo "$response" | jq -r '.instructions' || true
    else
        log_warning "Workflow generation failed: $response"
    fi
}

# Main workflow execution
main() {
    echo ""
    log_info "🚀 Starting Vitest Coverage MCP Server Demo Workflow"
    echo "==========================================================="
    
    # Check prerequisites
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed - some output will be less formatted"
    fi
    
    echo ""
    
    # Run the workflow steps
    check_server
    echo ""
    
    setup_vitest
    echo ""
    
    analyze_coverage
    echo ""
    
    generate_basic_tests
    echo ""
    
    generate_ai_tests
    echo ""
    
    profile_tests
    echo ""
    
    generate_badge
    echo ""
    
    generate_workflow
    echo ""
    
    log_success "🎉 Demo workflow completed!"
    echo ""
    log_info "Next steps:"
    echo "1. Review generated test files in __tests__ directories"
    echo "2. Run 'npm run coverage' to see updated coverage reports"
    echo "3. Check /coverage endpoint for detailed HTML coverage report"
    echo "4. Commit generated workflow file if it looks good"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Vitest Coverage MCP Server Demo Workflow"
        echo ""
        echo "Usage: $0 [project_path]"
        echo ""
        echo "Arguments:"
        echo "  project_path    Path to the React Vite project (default: current directory)"
        echo ""
        echo "Environment Variables:"
        echo "  OPENAI_API_KEY  OpenAI API key for AI test generation (optional)"
        echo ""
        echo "This script demonstrates the complete workflow:"
        echo "1. Check server health"
        echo "2. Setup Vitest in the project"
        echo "3. Analyze current coverage"
        echo "4. Generate basic tests for uncovered files"
        echo "5. Generate AI-powered tests (if OpenAI key available)"
        echo "6. Profile test performance"
        echo "7. Generate coverage badge"
        echo "8. Create CI workflow configuration"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac