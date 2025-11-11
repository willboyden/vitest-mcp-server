import fs from 'fs-extra';
import path from 'path';

/**
 * Generates an interactive HTML heatmap showing uncovered code lines
 */
export async function generateCoverageHeatmap(): Promise<string> {
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json');
  
  if (!(await fs.pathExists(coveragePath))) {
    throw new Error('Coverage file not found. Run coverage analysis first: npx vitest run --coverage');
  }

  const coverage = await fs.readJSON(coveragePath);
  
  // Generate HTML with embedded data
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Heatmap</title>
    <style>
        body {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            margin: 0;
            padding: 20px;
            background-color: #1e1e1e;
            color: #d4d4d4;
        }
        
        .header {
            background-color: #2d2d30;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .header h1 {
            color: #4ec9b0;
            margin: 0 0 10px 0;
        }
        
        .stats {
            display: flex;
            gap: 20px;
            margin-top: 15px;
        }
        
        .stat {
            background-color: #3c3c3c;
            padding: 10px 15px;
            border-radius: 5px;
        }
        
        .file-container {
            background-color: #252526;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        
        .file-header {
            background-color: #2d2d30;
            padding: 15px 20px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .file-header:hover {
            background-color: #37373d;
        }
        
        .file-name {
            color: #569cd6;
            font-weight: bold;
        }
        
        .coverage-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .coverage-high { background-color: #0f5132; color: #d1e7dd; }
        .coverage-medium { background-color: #664d03; color: #fff3cd; }
        .coverage-low { background-color: #842029; color: #f8d7da; }
        
        .file-content {
            max-height: 600px;
            overflow-y: auto;
            display: none;
        }
        
        .file-content.expanded {
            display: block;
        }
        
        .line {
            display: flex;
            align-items: stretch;
            border-bottom: 1px solid #3c3c3c;
        }
        
        .line-number {
            background-color: #2d2d30;
            color: #858585;
            padding: 4px 8px;
            min-width: 50px;
            text-align: right;
            border-right: 1px solid #3c3c3c;
        }
        
        .line-content {
            padding: 4px 8px;
            flex: 1;
            white-space: pre-wrap;
            word-break: break-all;
        }
        
        .line-covered {
            background-color: rgba(76, 175, 80, 0.1);
        }
        
        .line-uncovered {
            background-color: rgba(244, 67, 54, 0.2);
        }
        
        .line-partial {
            background-color: rgba(255, 193, 7, 0.1);
        }
        
        .legend {
            background-color: #252526;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .legend h3 {
            color: #4ec9b0;
            margin-top: 0;
        }
        
        .legend-items {
            display: flex;
            gap: 20px;
            margin-top: 10px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 3px;
        }
        
        .legend-covered { background-color: rgba(76, 175, 80, 0.3); }
        .legend-uncovered { background-color: rgba(244, 67, 54, 0.4); }
        .legend-partial { background-color: rgba(255, 193, 7, 0.3); }
        
        .search-box {
            margin-bottom: 20px;
        }
        
        .search-input {
            background-color: #3c3c3c;
            border: 1px solid #555;
            color: #d4d4d4;
            padding: 10px;
            border-radius: 5px;
            width: 300px;
        }
        
        .search-input:focus {
            outline: none;
            border-color: #4ec9b0;
        }
        
        .expand-all {
            background-color: #0e639c;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            margin-left: auto;
        }
        
        .expand-all:hover {
            background-color: #1177bb;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Coverage Heatmap</h1>
        <p>Interactive visualization of code coverage across your project</p>
        <div class="stats" id="stats">
            <!-- Stats will be populated by JavaScript -->
        </div>
    </div>

    <div class="legend">
        <h3>Coverage Legend</h3>
        <div class="legend-items">
            <div class="legend-item">
                <div class="legend-color legend-covered"></div>
                <span>Fully Covered (100%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color legend-partial"></div>
                <span>Partially Covered</span>
            </div>
            <div class="legend-item">
                <div class="legend-color legend-uncovered"></div>
                <span>Not Covered (0%)</span>
            </div>
        </div>
    </div>

    <div class="search-box">
        <input type="text" id="searchInput" class="search-input" placeholder="Search files...">
        <button class="expand-all" onclick="toggleAllFiles()">Expand All</button>
    </div>

    <div id="files-container">
        <!-- Files will be populated by JavaScript -->
    </div>

    <script>
        // Coverage data embedded from server
        const coverageData = ${JSON.stringify(coverage)};
        
        let expandedFiles = new Set();
        
        function calculateFileStats(fileData) {
            const statements = fileData.s || {};
            const branches = fileData.b || {};
            
            let totalStatements = 0;
            let coveredStatements = 0;
            let totalBranches = 0;
            let coveredBranches = 0;
            
            // Calculate statement coverage
            for (const count of Object.values(statements)) {
                totalStatements++;
                if ((count || 0) > 0) coveredStatements++;
            }
            
            // Calculate branch coverage
            for (const branchCounts of Object.values(branches)) {
                totalBranches += branchCounts.length;
                for (const count of branchCounts) {
                    if ((count || 0) > 0) coveredBranches++;
                }
            }
            
            const statementCoverage = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
            const branchCoverage = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;
            
            return {
                statementCoverage: Math.round(statementCoverage),
                branchCoverage: Math.round(branchCoverage),
                totalStatements,
                coveredStatements,
                uncoveredStatements: totalStatements - coveredStatements
            };
        }
        
        function getCoverageClass(coverage) {
            if (coverage >= 90) return 'coverage-high';
            if (coverage >= 50) return 'coverage-medium';
            return 'coverage-low';
        }
        
        function renderStats() {
            const files = Object.keys(coverageData);
            let totalFiles = files.length;
            let totalStatements = 0;
            let coveredStatements = 0;
            
            files.forEach(file => {
                const stats = calculateFileStats(coverageData[file]);
                totalStatements += stats.totalStatements;
                coveredStatements += stats.coveredStatements;
            });
            
            const overallCoverage = totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0;
            
            document.getElementById('stats').innerHTML = \`
                <div class="stat">
                    <strong>Files:</strong> \${totalFiles}
                </div>
                <div class="stat">
                    <strong>Overall Coverage:</strong> \${overallCoverage}%
                </div>
                <div class="stat">
                    <strong>Statements:</strong> \${coveredStatements} / \${totalStatements}
                </div>
            \`;
        }
        
        function renderFiles() {
            const container = document.getElementById('files-container');
            
            // Sort files by coverage (worst first)
            const sortedFiles = Object.entries(coverageData)
                .sort(([,a], [,b]) => {
                    const statsA = calculateFileStats(a);
                    const statsB = calculateFileStats(b);
                    return statsA.statementCoverage - statsB.statementCoverage;
                });
            
            container.innerHTML = sortedFiles.map(([file, data]) => {
                const stats = calculateFileStats(data);
                const isExpanded = expandedFiles.has(file);
                
                return \`
                    <div class="file-container">
                        <div class="file-header" onclick="toggleFile('\${encodeURIComponent(file)}')">
                            <span class="file-name">\${file}</span>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span class="coverage-badge \${getCoverageClass(stats.statementCoverage)}">
                                    \${stats.statementCoverage}% covered
                                </span>
                                <span style="color: #858585;">
                                    (\${stats.uncoveredStatements} uncovered statements)
                                </span>
                            </div>
                        </div>
                        <div class="file-content \${isExpanded ? 'expanded' : ''}" id="content-\${encodeURIComponent(file)}">
                            \${renderFileContent(data)}
                        </div>
                    </div>
                \`;
            }).join('');
        }
        
        function renderFileContent(fileData) {
            const statements = fileData.s || {};
            const lines = Object.keys(statements)
                .map(line => parseInt(line))
                .sort((a, b) => a - b);
            
            // Try to load source file content
            const fileName = Object.keys(coverageData).find(f => 
                JSON.stringify(fileData) === JSON.stringify(coverageData[f])
            );
            
            // For demo purposes, we'll create line content
            return lines.map(lineNum => {
                const coverage = statements[lineNum] || 0;
                let lineClass = 'line-covered';
                if (coverage === 0) lineClass = 'line-uncovered';
                
                return \`
                    <div class="line \${lineClass}">
                        <div class="line-number">\${lineNum}</div>
                        <div class="line-content">
                            // Line \${lineNum} - Coverage: \${coverage}
                        </div>
                    </div>
                \`;
            }).join('');
        }
        
        function toggleFile(encodedFile) {
            const content = document.getElementById('content-' + encodedFile);
            if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                expandedFiles.delete(decodeURIComponent(encodedFile));
            } else {
                content.classList.add('expanded');
                expandedFiles.add(decodeURIComponent(encodedFile));
            }
        }
        
        function toggleAllFiles() {
            const contents = document.querySelectorAll('.file-content');
            const shouldExpand = !contents[0]?.classList.contains('expanded');
            
            contents.forEach(content => {
                if (shouldExpand) {
                    content.classList.add('expanded');
                } else {
                    content.classList.remove('expanded');
                }
            });
        }
        
        function filterFiles() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const files = document.querySelectorAll('.file-container');
            
            files.forEach(file => {
                const fileName = file.querySelector('.file-name').textContent.toLowerCase();
                if (fileName.includes(searchTerm)) {
                    file.style.display = 'block';
                } else {
                    file.style.display = 'none';
                }
            });
        }
        
        // Initialize the page
        renderStats();
        renderFiles();
        
        // Add search functionality
        document.getElementById('searchInput').addEventListener('input', filterFiles);
        
        // Expand files with low coverage by default
        setTimeout(() => {
            const lowCoverageFiles = document.querySelectorAll('.coverage-low');
            lowCoverageFiles.forEach(badge => {
                const fileContainer = badge.closest('.file-container');
                const contentId = fileContainer.querySelector('.file-content').id;
                document.getElementById(contentId).classList.add('expanded');
            });
        }, 100);
    </script>
</body>
</html>`;

  const outPath = path.join(process.cwd(), 'coverage', 'heatmap.html');
  await fs.writeFile(outPath, html);
  
  return outPath;
}

// Plugin export
export default {
  name: 'coverage-heatmap',
  router(app: any) {
    app.get('/generate-heatmap', async (_req: any, res: any) => {
      try {
        const filePath = await generateCoverageHeatmap();
        
        res.json({
          success: true,
          heatmapPath: filePath,
          url: `/coverage/heatmap.html`,
          message: 'Coverage heatmap generated successfully'
        });
      } catch (e) {
        console.error('Heatmap generation error:', e);
        res.status(500).json({
          success: false,
          error: (e as any).message || 'Failed to generate coverage heatmap'
        });
      }
    });

    // Serve the heatmap directly
    app.get('/coverage-heatmap.html', async (_req: any, res: any) => {
      try {
        const heatmapPath = path.join(process.cwd(), 'coverage', 'heatmap.html');
        
        if (await fs.pathExists(heatmapPath)) {
          res.sendFile(heatmapPath);
        } else {
          // Generate on-demand if it doesn't exist
          const filePath = await generateCoverageHeatmap();
          res.sendFile(filePath);
        }
      } catch (e) {
        console.error('Heatmap serving error:', e);
        res.status(500).send('Error generating heatmap');
      }
    });
  },
};