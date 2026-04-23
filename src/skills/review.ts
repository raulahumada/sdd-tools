import { Store } from '../core/store.js';
import { ASTUtils } from '../core/ast-utils.js';
import { SkillResult, ReviewIssue } from '../core/types.js';
import { readFileSync, existsSync } from 'fs';
import { basename, join } from 'path';

export async function reviewSkill(
  args: string[],
  projectRoot: string = process.cwd()
): Promise<SkillResult> {
  const [action, specPath] = args;

  if (action === 'check') return check(specPath, projectRoot);
  if (action === 'patterns') return showPatterns(projectRoot);

  return { success: false, message: 'Usage: sdd-tools review check <spec-path>' };
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

  const featureName = specPath
    ? basename(specPath.replace(/\\/g, '/').replace(/\/+$/, ''))
    : 'review';
  const report = generateReviewReport(featureName, issues, sourceFiles);
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
  const handlerRegex = /\.(post|put|patch)\s*\(\s*['"`].+?['"`]/g;
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
        suggestion: 'Añadir validación de entrada (Zod, Joi o comprobaciones manuales explícitas).',
        pattern: 'input-validation',
        patternFrequency: 0
      });
    }
  }

  return issues;
}

function checkErrorHandling(file: string, content: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const asyncRegex = /async\s+(?:function\s+)?(?:\w+\s*)?\([^)]*\)\s*\{/g;
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
        suggestion: 'Envolver en try/catch y devolver o propagar errores de forma controlada.',
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
      suggestion: 'Eliminar o sustituir por un logger estructurado (p. ej. pino) según convención del proyecto.',
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
      suggestion: 'Resolver o convertir en ticket/issue rastreable.',
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
      suggestion: 'Sustituir por un tipo explícito o inferido.',
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

function posixPath(file: string): string {
  return file.replace(/\\/g, '/');
}

function generateReviewReport(
  featureName: string,
  issues: ReviewIssue[],
  scannedFiles: string[]
): string {
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  let report = `# Pre-Review Report: ${featureName}\n\n`;
  report += `## Summary\n`;
  report += `- 🔴 Errors: ${errors.length}\n`;
  report += `- 🟡 Warnings: ${warnings.length}\n`;
  report += `- ℹ️ Info: ${infos.length}\n\n`;

  report += `## Alcance del análisis automático\n\n`;
  report += `- **Archivos fuente revisados:** ${scannedFiles.length} (patrones \`src/**/*.ts\`, \`src/**/*.tsx\`, \`src/**/*.js\`, \`src/**/*.jsx\`, excl. tests).\n`;
  report += `- **Reglas aplicadas:** rutas mutadoras sin validación aparente; funciones \`async\` sin \`try/catch\`; \`console.log|debug|info\`; comentarios TODO/FIXME; uso de tipo \`any\`.\n`;
  if (scannedFiles.length > 0) {
    const sample = scannedFiles.slice(0, 20).map(f => `- \`${posixPath(f)}\``).join('\n');
    report += `\n**Muestra de archivos** (máx. 20):\n\n${sample}\n`;
    if (scannedFiles.length > 20) {
      report += `\n_…y ${scannedFiles.length - 20} más._\n`;
    }
  }
  report += '\n';

  if (errors.length === 0 && warnings.length === 0) {
    report += `## Estado general\n\n`;
    report +=
      'No se detectaron **errores** ni **advertencias** con las heurísticas actuales. Los ítems en **Info** son sugerencias (p. ej. logging) y no bloquean por sí solos.\n\n';
  }

  if (errors.length > 0) {
    report += `## 🔴 Errors\n\n`;
    for (const i of errors) {
      report += `### ${i.issue}\n`;
      report += `- **Archivo:** \`${posixPath(i.file ?? '')}\`${i.line ? `, línea ${i.line}` : ''}\n`;
      report += `- **Sugerencia:** ${i.suggestion}\n\n`;
    }
  }

  if (warnings.length > 0) {
    report += `## 🟡 Warnings\n\n`;
    for (const i of warnings) {
      report += `### ${i.issue}\n`;
      report += `- **Archivo:** \`${posixPath(i.file ?? '')}\`${i.line ? `, línea ${i.line}` : ''}\n`;
      report += `- **Sugerencia:** ${i.suggestion}\n\n`;
    }
  }

  if (infos.length > 0) {
    report += `## ℹ️ Info\n\n`;
    for (const i of infos) {
      report += `### ${i.issue}\n`;
      report += `- **Archivo:** \`${posixPath(i.file ?? '')}\`${i.line ? `, línea ${i.line}` : ''}\n`;
      report += `- **Sugerencia:** ${i.suggestion}\n\n`;
    }
  }

  report += `## Próximos pasos sugeridos\n\n`;
  if (errors.length || warnings.length) {
    report +=
      '1. Corregir cada error y, si aplica, las advertencias que afecten contrato o seguridad.\n2. Volver a ejecutar `npx sdd-tools review check` (con la misma ruta de feature si la usas).\n';
  } else {
    report +=
      '1. Revisar manualmente lógica de negocio, límites y casos borde (el pre-review no los cubre).\n2. Si aplica, sustituir `console.log` por logger o eliminarlo antes de merge a producción.\n';
  }

  return report;
}
