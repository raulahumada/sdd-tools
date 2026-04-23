import { SpecParser } from '../core/spec-parser.js';
import { ASTUtils } from '../core/ast-utils.js';
import { Store } from '../core/store.js';
import { SkillResult, Requirement, TestCase, RequirementCoverage } from '../core/types.js';
import { existsSync } from 'fs';
import { join } from 'path';

export async function testgapSkill(
  args: string[],
  projectRoot: string = process.cwd()
): Promise<SkillResult> {
  const [action, specPath] = args;

  if (action === 'analyze') return analyze(specPath!, projectRoot);

  return { success: false, message: 'Usage: sdd-kit testgap analyze <spec-path>' };
}

async function analyze(specPath: string, projectRoot: string): Promise<SkillResult> {
  const parser = new SpecParser(projectRoot);
  const ast = new ASTUtils(projectRoot);
  const store = new Store(projectRoot);

  const specDir = await parser.findSpec(specPath);
  const specFilePath = join(projectRoot, specDir, 'spec.md');
  
  if (!existsSync(specFilePath)) {
    return { success: false, message: `spec.md not found in ${specDir}` };
  }

  const requirements = parser.parseRequirements(specFilePath);

  const testFiles = await ast.findTestFiles();
  const allTests: TestCase[] = [];
  for (const file of testFiles) {
    allTests.push(...ast.extractTests(file));
  }

  const coverage = mapRequirementsToTests(requirements, allTests);

  const featureName = specPath.split('/').filter(Boolean).pop() || 'unknown';
  const report = generateTestGapReport(featureName, coverage);
  const outputPath = store.write(featureName, 'testgap.md', report);

  const covered = coverage.filter(c => c.verified).length;
  const total = coverage.length;
  const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;

  console.log(`✓ Test gap analysis saved to ${outputPath}`);
  console.log(`  Coverage: ${percentage}% (${covered}/${total} requirements)`);

  return {
    success: true,
    message: `${percentage}% requirement coverage (${covered}/${total})`,
    outputPath
  };
}

function specDir(dirOrPath: string, projectRoot: string): string {
  if (existsSync(join(projectRoot, dirOrPath, 'spec.md'))) return dirOrPath;
  return dirOrPath;
}

function mapRequirementsToTests(
  requirements: Requirement[],
  tests: TestCase[]
): RequirementCoverage[] {
  return requirements.map(req => {
    const matchingTests = tests.filter(test => {
      const testName = test.name.toLowerCase();
      const testBody = test.body.toLowerCase();
      const keywordHits = req.keywords.filter(kw =>
        testName.includes(kw.toLowerCase()) || testBody.includes(kw.toLowerCase())
      );
      return keywordHits.length >= 2;
    });

    const verified = matchingTests.filter(t => t.assertions.length > 0);

    return {
      requirement: req,
      tests: matchingTests,
      verified: verified.length > 0,
      confidence: verified.length > 0 ? 'HIGH' : matchingTests.length > 0 ? 'MEDIUM' : 'LOW'
    };
  });
}

function generateTestGapReport(featureName: string, coverage: RequirementCoverage[]): string {
  const covered = coverage.filter(c => c.verified);
  const gaps = coverage.filter(c => !c.verified);
  const total = coverage.length;
  const percentage = total > 0 ? Math.round((covered.length / total) * 100) : 0;

  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;
  const bar = `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;

  let report = `# Test Gap Report: ${featureName}\n\n`;
  report += `## Semantic Coverage: ${percentage}% (${covered.length}/${total})\n\n`;
  report += `\`\`\`\n${bar} ${percentage}% requirement coverage\n\`\`\`\n\n`;

  if (covered.length > 0) {
    report += `## ✅ Covered (${covered.length}/${total})\n\n`;
    report += `| Req | Requirement | Test | File |\n`;
    report += `|---|---|---|---|\n`;
    for (const c of covered) {
      report += `| ${c.requirement.id} | ${c.requirement.text.substring(0, 50)}... | "${c.tests[0]?.name || 'N/A'}" | ${c.tests[0]?.file || 'N/A'} |\n`;
    }
    report += '\n';
  }

  if (gaps.length > 0) {
    report += `## 🔴 Gaps (${gaps.length}/${total})\n\n`;
    report += `| Req | Requirement | Suggested Test |\n`;
    report += `|---|---|---|\n`;
    for (const g of gaps) {
      report += `| ${g.requirement.id} | ${g.requirement.text.substring(0, 50)}... | \`test('${g.requirement.keywords.slice(0, 3).join(' ')}', ...)\` |\n`;
    }
    report += '\n';
  }

  if (percentage === 100) {
    report += '✅ All requirements have test coverage!\n';
  } else {
    report += `⚠️ Add ${gaps.length} test${gaps.length > 1 ? 's' : ''} to reach 100% requirement coverage.\n`;
  }

  return report;
}
