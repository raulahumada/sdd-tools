import { Store } from '../core/store.js';
import { ASTUtils } from '../core/ast-utils.js';
import { SkillResult, DebtModule, DebtReport } from '../core/types.js';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

export async function debtSkill(
  args: string[],
  projectRoot: string = process.cwd()
): Promise<SkillResult> {
  const [action] = args;

  if (action === 'scan') return scan(projectRoot);
  if (action === 'trend') return trend(projectRoot);

  return { success: false, message: 'Usage: sdd-kit debt scan|trend' };
}

async function scan(projectRoot: string): Promise<SkillResult> {
  const store = new Store(projectRoot);
  const ast = new ASTUtils(projectRoot);

  const sourceFiles = await ast.findSourceFiles();
  const moduleMap = new Map<string, string[]>();

  for (const file of sourceFiles) {
    const parts = file.replace(/\\/g, '/').split('/');
    const moduleName = parts.length > 2 ? parts[1] : 'root';
    if (!moduleMap.has(moduleName)) moduleMap.set(moduleName, []);
    moduleMap.get(moduleName)!.push(file);
  }

  const modules: DebtModule[] = [];

  for (const [moduleName, files] of moduleMap) {
    let totalScore = 0;

    for (const file of files) {
      const fullPath = join(projectRoot, file);
      if (!existsSync(fullPath)) continue;

      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      let fileScore = 10;

      const anyCount = (content.match(/:\s*any\b/g) || []).length;
      fileScore -= anyCount * 0.5;

      const consoleCount = (content.match(/console\.(log|debug)/g) || []).length;
      fileScore -= consoleCount * 0.3;

      const todoCount = (content.match(/\/\/\s*(TODO|FIXME|HACK)/gi) || []).length;
      fileScore -= todoCount * 0.5;

      if (lines.length > 300) fileScore -= 1;
      if (lines.length > 500) fileScore -= 2;

      totalScore += Math.max(0, Math.min(10, fileScore));
    }

    const avgScore = files.length > 0 ? totalScore / files.length : 10;

    modules.push({
      name: moduleName,
      score: Math.round(avgScore * 10) / 10,
      trend: 'stable',
      topIssue: getTopIssue(files, projectRoot)
    });
  }

  const overallScore = modules.length > 0
    ? Math.round((modules.reduce((sum, m) => sum + m.score, 0) / modules.length) * 10) / 10
    : 10;

  const report: DebtReport = {
    overallScore,
    modules: modules.sort((a, b) => a.score - b.score),
    trend: 'stable',
    suggestedSpecs: modules.filter(m => m.score < 6).map(m => `"Refactor ${m.name} module"`)
  };

  const today = new Date().toISOString().split('T')[0];
  const reportContent = generateDebtReport(report);
  const historyContent = JSON.stringify({
    date: today,
    overallScore,
    modules: modules.map(m => ({ name: m.name, score: m.score }))
  }, null, 2);

  store.writeDebt('report.md', reportContent);
  store.writeDebtHistory(`${today}.md`, historyContent);

  console.log(`✓ Debt report saved`);
  console.log(`  Overall score: ${overallScore}/10`);

  return { success: true, message: `Score: ${overallScore}/10` };
}

async function trend(projectRoot: string): Promise<SkillResult> {
  const historyDir = join(projectRoot, 'sdd-tools', 'debt', 'history');

  if (!existsSync(historyDir)) {
    console.log('No history yet.');
    return { success: true, message: 'No history yet' };
  }

  const files = readdirSync(historyDir).filter(f => f.endsWith('.md')).sort();

  console.log('Debt Trend:');
  for (const file of files) {
    const content = readFileSync(join(historyDir, file), 'utf-8');
    try {
      const data = JSON.parse(content);
      console.log(`  ${data.date}: ${data.overallScore}/10`);
    } catch { /* skip */ }
  }

  return { success: true, message: 'Showed trend' };
}

function getTopIssue(files: string[], projectRoot: string): string {
  let maxTodos = 0;
  let maxAnys = 0;

  for (const file of files) {
    const fullPath = join(projectRoot, file);
    if (!existsSync(fullPath)) continue;
    const content = readFileSync(fullPath, 'utf-8');
    maxTodos = Math.max(maxTodos, (content.match(/\/\/\s*(TODO|FIXME)/gi) || []).length);
    maxAnys = Math.max(maxAnys, (content.match(/:\s*any\b/g) || []).length);
  }

  if (maxAnys > 3) return `${maxAnys} uses of "any" type`;
  if (maxTodos > 2) return `${maxTodos} TODOs/FIXMEs`;
  return 'No major issues';
}

function generateDebtReport(report: DebtReport): string {
  const trendEmoji = report.trend === 'up' ? '↑' : report.trend === 'down' ? '↓' : '→';

  let md = `# Debt Report\n\n`;
  md += `## Overall Score: ${report.overallScore}/10 ${trendEmoji} (${report.trend})\n\n`;
  md += `### By Module\n\n`;
  md += `| Module | Score | Trend | Top Issue |\n`;
  md += `|---|---|---|---|\n`;

  for (const m of report.modules) {
    const t = m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→';
    md += `| ${m.name} | ${m.score}/10 | ${t} | ${m.topIssue} |\n`;
  }

  if (report.suggestedSpecs.length > 0) {
    md += `\n### Suggested Specs\n\n`;
    report.suggestedSpecs.forEach((s, i) => { md += `${i + 1}. ${s}\n`; });
  }

  return md;
}
