import { Store } from '../core/store.js';
import { ASTUtils } from '../core/ast-utils.js';
import { SkillResult, ReviewIssue } from '../core/types.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function reviewSkill(
  args: string[],
  projectRoot: string = process.cwd()
): Promise<SkillResult> {
  const [action, specPath] = args;

  if (action === 'check') return check(specPath, projectRoot);
  if (action === 'patterns') return showPatterns(projectRoot);

  return { success: false, message: 'Usage: sdd-kit review check <spec-path>' };
}

async function check(specPath: string | undefined, projectRoot: string): Promise<SkillResult> {
  const store = new Store(projectRoot);
  const ast = new ASTUtils(projectRoot);

  const sourceFiles = await ast.findSourceFiles();
  const issues: ReviewIssue[] = [];

  for (const file of sourceFiles) {
    const fullPath = join(projectRoot, file);
    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    issues.push(...checkInputValidation(file, content, lines));
    issues.push(...checkErrorHandling(file, content));
    issues.push(...checkConsoleLogs(file, content));
    issues.push(...checkTodos(file, content));
    issues.push(...checkAnyTypes(file, content));
  }

  const featureName = specPath?.split('/').filter(Boolean).pop() || 'review';
  const report = generateReviewReport(featureName, issues);
  const outputPath = store.write(featureName, 'review.md', report);

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  console.log(`✓ Review saved to ${outputPath}`);
  console.log(`  ${errorCount} errors, ${warningCount} warnings`);

  return { success: true, message: `${errorCount} errors, ${warningCount} warnings`, outputPath };
}

async function showPatterns(projectRoot: string): Promise<SkillResult> {
  const store = new Store(projectRoot);
  const patterns = store.read('global', 'review-patterns.md');

  if (patterns) {
    console.log(patterns);
  } else {
    console.log('No patterns learned yet. Run a review first.');
  }

  return { success: true, message: 'Showed patterns' };
}

// ─── Checks ───

function checkInputValidation(file: string, content: string, lines: string[]): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const handlerRegex = /\.(post|put|patch)$$\s*['"`].+?['"`]/g;
  let match;

  while ((match = handlerRegex.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    const blockEnd = findBlockEnd(content, match.index);
    const block = content.substring(match.index, blockEnd);

    if (!/(zod|joi|validate|schema|req\.body\.\w+)/.test(block)) {
      issues.push({
        severity: 'warning',
        confidence: 'HIGH',
        file,
        line,
        issue: 'Missing input validation',
        suggestion: 'Add input validation (Zod, Joi, or manual checks)',
        pattern: 'input-validation',
        patternFrequency: 0
      });
    }
  }

  return issues;
}

function checkErrorHandling(file: string, content: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const asyncRegex = /async\s+(?:function\s+)?(?:\w+\s*)?\([^)]*$$\s*\{/g;
  let match;

  while ((match = asyncRegex.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    const blockEnd = findBlockEnd(content, match.index);
    const block = content.substring(match.index, blockEnd);

    if (!/try\s*\{/.test(block)) {
      issues.push({
        severity: 'warning',
        confidence: 'MEDIUM',
        file,
        line,
        issue: 'Async function without try/catch',
        suggestion: 'Wrap in try/catch with proper error response',
        pattern: 'error-handling',
        patternFrequency: 0
      });
    }
  }

  return issues;
}

function checkConsoleLogs(file: string, content: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const consoleRegex = /console\.(log|debug|info)\(/g;
  let match;

  while ((match = consoleRegex.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    issues.push({
      severity: 'info',
      confidence: 'HIGH',
      file,
      line,
      issue: `console.${match[1]} left behind`,
      suggestion: 'Remove or replace with proper logger',
      pattern: 'console-log',
      patternFrequency: 0
    });
  }

  return issues;
}

function checkTodos(file: string, content: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const todoRegex = /\/\/\s*(TODO|FIXME|HACK|XXX):?\s*(.*)/gi;
  let match;

  while ((match = todoRegex.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    issues.push({
      severity: 'info',
      confidence: 'HIGH',
      file,
      line,
      issue: `${match[1]}: ${match[2] || 'no description'}`,
      suggestion: 'Address or convert to tracked issue',
      pattern: 'todo-fixme',
      patternFrequency: 0
    });
  }

  return issues;
}

function checkAnyTypes(file: string, content: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const anyRegex = /:\s*any\b/g;
  let match;

  while ((match = anyRegex.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    issues.push({
      severity: 'warning',
      confidence: 'HIGH',
      file,
      line,
      issue: 'Type "any" used',
      suggestion: 'Replace with proper type',
      pattern: 'missing-types',
      patternFrequency: 0
    });
  }

  return issues;
}

function findBlockEnd(content: string, start: number): number {
  let depth = 0;
  let started = false;
  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') { depth++; started = true; }
    if (content[i] === '}') { depth--; }
    if (started && depth === 0) return i + 1;
  }
  return content.length;
}

function generateReviewReport(featureName: string, issues: ReviewIssue[]): string {
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  let report = `# Pre-Review Report: ${featureName}\n\n`;
  report += `## Summary\n`;
  report += `- 🔴 Errors: ${errors.length}\n`;
  report += `- 🟡 Warnings: ${warnings.length}\n`;
  report += `- ℹ️ Info: ${infos.length}\n\n`;

  if (errors.length > 0) {
    report += `## 🔴 Errors\n\n`;
    for (const i of errors) {
      report += `### ${i.issue}\n`;
      report += `- **File:** ${i.file}${i.line ? `:${i.line}` : ''}\n`;
      report += `- **Suggestion:** ${i.suggestion}\n\n`;
    }
  }

  if (warnings.length > 0) {
    report += `## 🟡 Warnings\n\n`;
    for (const i of warnings) {
      report += `### ${i.issue}\n`;
      report += `- **File:** ${i.file}${i.line ? `:${i.line}` : ''}\n`;
      report += `- **Suggestion:** ${i.suggestion}\n\n`;
    }
  }

  if (infos.length > 0) {
    report += `## ℹ️ Info\n\n`;
    for (const i of infos) {
      report += `### ${i.issue}\n`;
      report += `- **File:** ${i.file}${i.line ? `:${i.line}` : ''}\n`;
      report += `- **Suggestion:** ${i.suggestion}\n\n`;
    }
  }

  return report;
}
