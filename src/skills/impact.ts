import { SpecParser } from '../core/spec-parser.js';
import { ASTUtils } from '../core/ast-utils.js';
import { Store } from '../core/store.js';
import { SkillResult, ImpactResult } from '../core/types.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function impactSkill(
  args: string[],
  projectRoot: string = process.cwd()
): Promise<SkillResult> {
  const [action, specPath] = args;

  if (action === 'analyze') {
    return analyze(specPath!, projectRoot);
  }

  if (action === 'full-scan') {
    return fullScan(projectRoot);
  }

  return { success: false, message: 'Usage: sdd-kit impact analyze <spec-path>' };
}

async function analyze(specPath: string, projectRoot: string): Promise<SkillResult> {
  const parser = new SpecParser(projectRoot);
  const ast = new ASTUtils(projectRoot);
  const store = new Store(projectRoot);

  const specDir = await parser.findSpec(specPath);
  const tasks = parser.parseTasks(specDir);
  const filesReferenced = extractFileReferences(specDir, projectRoot);
  const impact = await ast.analyzeImpact([...new Set(filesReferenced)]);

  const featureName = specPath.split('/').filter(Boolean).pop() || 'unknown';
  const report = generateReport(featureName, impact, tasks);
  const outputPath = store.write(featureName, 'impact.md', report);

  console.log(`✓ Impact analysis saved to ${outputPath}`);

  return {
    success: true,
    message: `Risk ${impact.riskLevel}: ${impact.affectedModules.length} modules affected`,
    outputPath
  };
}

async function fullScan(projectRoot: string): Promise<SkillResult> {
  const parser = new SpecParser(projectRoot);
  const specs = await parser.findAllSpecs();

  for (const spec of specs) {
    await analyze(spec, projectRoot);
  }

  return { success: true, message: `Scanned ${specs.length} specs` };
}

function extractFileReferences(specDir: string, projectRoot: string): string[] {
  const files: string[] = [];

  for (const name of ['spec.md', 'design.md', 'tasks.md']) {
    const filePath = join(projectRoot, specDir, name);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, 'utf-8');
    const fileRegex = /(?:src\/|\.\/|["'`])([\w\/.-]+\.(?:ts|js|tsx|jsx))/g;
    let match;
    while ((match = fileRegex.exec(content)) !== null) {
      files.push(match[1]);
    }
  }

  return files;
}

function generateReport(
  featureName: string,
  impact: ImpactResult,
  tasks: { name: string; done: boolean }[]
): string {
  const riskEmoji = impact.riskLevel === 'HIGH' ? '🔴' : impact.riskLevel === 'MEDIUM' ? '🟡' : '🟢';

  return `# Impact Report: ${featureName}

## Risk Score: ${impact.riskScore}/10 ${riskEmoji} (${impact.riskLevel})

### Affected Modules

| Module | Coupling | Risk | Tests at Risk |
|---|---|---|---|
${impact.affectedModules.map(m =>
    `| ${m.path} | ${m.coupling} | ${m.risk === 'HIGH' ? '🔴' : m.risk === 'MEDIUM' ? '🟡' : '🟢'} | ${m.testsAtRisk} |`
  ).join('\n')}

### Recommended Implementation Order

${impact.recommendedOrder.map((f, i) => `${i + 1}. ${f}`).join('\n')}

### Breaking Change Predictions

${impact.breakingChanges.length > 0
    ? impact.breakingChanges.map(b => `- ${b}`).join('\n')
    : 'No breaking changes predicted.'}

### Tasks Status

${tasks.length > 0
    ? tasks.map(t => `- [${t.done ? 'x' : ' '}] ${t.name}`).join('\n')
    : 'No tasks found.'}
`;
}
