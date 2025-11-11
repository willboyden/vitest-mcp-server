import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

/**
 * Profiles test execution and identifies slow tests
 */
export async function profileTests(): Promise<any> {
  const outFile = path.join(process.cwd(), 'coverage', 'test-profile.json');
  
  // Run vitest with JSON reporter to get detailed timing information
  execSync(`npx vitest run --reporter=json --outputFile=${outFile}`, { stdio: 'inherit' });
  
  const data = await fs.readJSON(outFile);
  
  // Extract test results with timing information
  const allTests = data.testResults?.flatMap((suite: any) => 
    suite.assertionResults?.map((test: any) => ({
      title: test.title,
      fullName: test.fullName,
      duration: test.duration || 0,
      status: test.status,
      suite: suite.name,
      file: suite.file
    })) || []
  ) || [];

  // Sort by duration (slowest first)
  const sortedTests = allTests
    .filter(test => test.duration > 0) // Only include tests with timing data
    .sort((a, b) => (b.duration || 0) - (a.duration || 0));

  // Generate statistics
  const totalTests = sortedTests.length;
  const avgDuration = totalTests > 0 ? 
    sortedTests.reduce((sum, test) => sum + (test.duration || 0), 0) / totalTests : 0;
  
  const slowThreshold = Math.max(1000, avgDuration * 2); // 1s or 2x average
  const slowTests = sortedTests.filter(test => (test.duration || 0) > slowThreshold);

  // Group by suite for analysis
  const suites = sortedTests.reduce((acc: any, test) => {
    if (!acc[test.suite]) {
      acc[test.suite] = { tests: [], totalDuration: 0, avgDuration: 0 };
    }
    acc[test.suite].tests.push(test);
    acc[test.suite].totalDuration += test.duration || 0;
    return acc;
  }, {});

  // Calculate average duration per suite
  for (const [suiteName, suiteData] of Object.entries(suites)) {
    const tests = suiteData.tests;
    suiteData.avgDuration = tests.length > 0 ? 
      tests.reduce((sum: number, test: any) => sum + (test.duration || 0), 0) / tests.length : 0;
  }

  return {
    success: true,
    summary: {
      totalTests,
      avgDuration: Math.round(avgDuration),
      slowTestCount: slowTests.length,
      slowThreshold
    },
    slowestTests: sortedTests.slice(0, 10),
    slowTests,
    suites: Object.entries(suites).map(([name, data]: [string, any]) => ({
      name,
      testCount: data.tests.length,
      totalDuration: Math.round(data.totalDuration),
      avgDuration: Math.round(data.avgDuration)
    })).sort((a, b) => b.totalDuration - a.totalDuration),
    recommendations: generateRecommendations(sortedTests, slowThreshold)
  };
}

function generateRecommendations(tests: any[], threshold: number) {
  const recommendations = [];
  
  // Check for very slow tests
  const verySlowTests = tests.filter(test => (test.duration || 0) > threshold * 2);
  if (verySlowTests.length > 0) {
    recommendations.push({
      type: 'performance',
      severity: 'high',
      message: `${verySlowTests.length} tests are taking longer than ${Math.round(threshold/1000)}s. Consider splitting them or adding timeouts.`,
      affectedTests: verySlowTests.map(t => t.fullName)
    });
  }

  // Check for tests that might need parallelization
  const longRunningTests = tests.filter(test => (test.duration || 0) > 500);
  if (longRunningTests.length > 5) {
    recommendations.push({
      type: 'parallelization',
      severity: 'medium',
      message: `Consider running ${longRunningTests.length} long-running tests in parallel to improve overall test suite speed.`,
      affectedTests: longRunningTests.map(t => t.fullName)
    });
  }

  // Check for tests with no assertions (likely incomplete)
  const potentiallyIncomplete = tests.filter(test => 
    test.title.toLowerCase().includes('renders') && (test.duration || 0) < 10
  );
  
  if (potentiallyIncomplete.length > 0) {
    recommendations.push({
      type: 'completeness',
      severity: 'low',
      message: `${potentiallyIncomplete.length} render-only tests might need additional assertions.`,
      affectedTests: potentiallyIncomplete.map(t => t.fullName)
    });
  }

  return recommendations;
}

// Plugin export
export default {
  name: 'test-profiler',
  router(app: any) {
    app.get('/profile-tests', async (_req: any, res: any) => {
      try {
        const profile = await profileTests();
        
        if (profile.success) {
          res.json(profile);
        } else {
          res.status(500).json({ 
            success: false, 
            error: 'Failed to profile tests' 
          });
        }
      } catch (e) {
        console.error('Test profiling error:', e);
        res.status(500).json({ 
          success: false, 
          error: (e as any).message || 'Failed to profile tests' 
        });
      }
    });

    // Endpoint for detailed test analysis
    app.get('/test-analysis', async (_req: any, res: any) => {
      try {
        const profile = await profileTests();
        
        // Generate a detailed analysis report
        const analysis = {
          timestamp: new Date().toISOString(),
          ...profile,
          report: generateDetailedReport(profile)
        };
        
        res.json(analysis);
      } catch (e) {
        console.error('Test analysis error:', e);
        res.status(500).json({ 
          success: false, 
          error: (e as any).message || 'Failed to analyze tests' 
        });
      }
    });
  },
};

function generateDetailedReport(profile: any) {
  const { summary, slowestTests, recommendations } = profile;
  
  let report = `# Test Performance Report\n\n`;
  report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  
  report += `## Summary\n`;
  report += `- Total Tests: ${summary.totalTests}\n`;
  report += `- Average Duration: ${summary.avgDuration}ms\n`;
  report += `- Slow Tests (>${Math.round(summary.slowThreshold/1000)}s): ${summary.slowTestCount}\n\n`;
  
  if (slowestTests.length > 0) {
    report += `## Top 5 Slowest Tests\n`;
    slowestTests.slice(0, 5).forEach((test: any, index: number) => {
      report += `${index + 1}. **${test.fullName}** - ${Math.round(test.duration)}ms\n`;
    });
    report += `\n`;
  }
  
  if (recommendations.length > 0) {
    report += `## Recommendations\n`;
    recommendations.forEach((rec: any, index: number) => {
      report += `${index + 1}. **[${rec.severity.toUpperCase()}] ${rec.type}**: ${rec.message}\n`;
    });
  }
  
  return report;
}