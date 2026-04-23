// src/skills/impact.ts

import { SpecParser } from '../core/spec-parser.js';
import { ASTUtils } from '../core/ast-utils.js';
import { Store } from '../core/store.js';
import { SkillResult, ImpactResult } from '../core/types.js';
import { readFileSync, existsSync } from 'fs';
import { basename, join } from 'path';
import { glob } from 'glob';

interface SpecDocument {
  relativePath: string;
  content: string;
}

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

  return { success: false, message: 'Usage: sdd-tools impact analyze <spec-path>' };
}

async function analyze(specPath: string, projectRoot: string): Promise<SkillResult> {
  const parser = new SpecParser(projectRoot);
  const ast = new ASTUtils(projectRoot);
  const store = new Store(projectRoot);

  const specDir = await parser.findSpec(specPath);
  const tasks = parser.parseTasks(specDir);
  const specDirAbs = join(projectRoot, specDir);
  const specDocuments = await collectSpecMarkdowns(specDirAbs);
  const filesReferenced = extractFileReferencesFromContents(specDocuments);
  const impact = await ast.analyzeImpact([...new Set(filesReferenced)]);

  const featureName = basename(specDir.replace(/\\/g, '/'));
  const narrative = synthesizeSpecImpact(specDocuments, filesReferenced);
  const report = generateReport(featureName, impact, tasks, narrative, specDocuments);
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

async function collectSpecMarkdowns(specDirAbs: string): Promise<SpecDocument[]> {
  if (!existsSync(specDirAbs)) return [];

  const relPaths = (await glob('**/*.md', { cwd: specDirAbs })).map(p => p.split(/[/\\]/).join('/'));
  const out: SpecDocument[] = [];

  for (const rel of relPaths.sort()) {
    const filePath = join(specDirAbs, rel);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf-8');
    out.push({ relativePath: rel, content });
  }

  return out;
}

function extractFileReferencesFromContents(documents: SpecDocument[]): string[] {
  const files: string[] = [];
  const fileRegex = /(?:src\/|\.\/|["'`])([\w/.-]+\.(?:tsx|ts|jsx|js))\b/g;

  for (const { content } of documents) {
    let match;
    while ((match = fileRegex.exec(content)) !== null) {
      files.push(match[1]);
    }
  }

  return files;
}

function collapseWs(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stripCodeFences(text: string): string {
  return text.replace(/```[\s\S]*?```/g, ' ').trim();
}

function sliceSection(content: string, headingRe: RegExp): string | null {
  const m = content.match(headingRe);
  if (!m || !m[1]) return null;
  return m[1].trim();
}

function docBlurb(doc: SpecDocument): string {
  const { content, relativePath } = doc;
  const lower = relativePath.toLowerCase();

  if (lower.includes('proposal')) {
    const intent = sliceSection(
      content,
      /##\s+Intent\s*\n+([\s\S]*?)(?=\n##\s|\n###\s|$)/i
    );
    if (intent) return collapseWs(intent).slice(0, 320);
  }
  if (lower.includes('design')) {
    const dec = sliceSection(
      content,
      /##\s+Decisions?\s*\n+([\s\S]*?)(?=\n##\s|\n###\s|$)/i
    );
    if (dec) {
      const cleaned = stripCodeFences(dec);
      const bullets = cleaned
        .split('\n')
        .map(l => l.trim())
        .filter(l => /^-\s+/.test(l))
        .slice(0, 5)
        .map(l =>
          l
            .replace(/^-\s+/, '')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .trim()
        )
        .filter(b => b.replace(/\s+/g, '').length > 4 && !/^[^:]+:\s*$/.test(b));
      if (bullets.length > 0) {
        return collapseWs(bullets.join(' · '))
          .replace(/\s*·\s*·+/g, ' ·')
          .replace(/\s*·\s*$/, '')
          .replace(/:\s*·/g, ': ')
          .replace(/\bcuerpo fijo:\s*/gi, 'cuerpo JSON fijo (ver spec); ')
          .slice(0, 320);
      }
      return collapseWs(cleaned).slice(0, 320);
    }
    const ctx = sliceSection(
      content,
      /##\s+Context\s*\n+([\s\S]*?)(?=\n##\s|\n###\s|$)/i
    );
    if (ctx) return collapseWs(stripCodeFences(ctx)).slice(0, 320);
  }
  if (lower.endsWith('spec.md')) {
    const req = content.match(/###\s+Requirement:\s*([^\n]+)/i);
    if (req) return `Requisito: ${req[1].trim().slice(0, 220)}`;
    const added = sliceSection(
      content,
      /##\s+ADDED\s+Requirements?\s*\n+([\s\S]*?)(?=\n##\s|$)/i
    );
    if (added) return collapseWs(added).slice(0, 300);
  }
  if (lower.includes('tasks')) {
    const pending = content.split('\n').filter(l => /^\s*[-*]\s+\[\s*\]\s+/.test(l)).length;
    const done = content.split('\n').filter(l => /^\s*[-*]\s+\[x\]\s+/i.test(l)).length;
    return `Checklist: ${done} hechas, ${pending} pendientes (aprox.).`;
  }

  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim().slice(0, 200);
  return collapseWs(content).slice(0, 160) || '—';
}

function collectNormativeLines(docs: SpecDocument[], max: number): string[] {
  const out: string[] = [];
  for (const d of docs) {
    for (const line of d.content.split('\n')) {
      const t = line.trim();
      if (
        out.length < max &&
        (/^[-*]\s+.*\b(MUST|SHALL|SHOULD)\b/i.test(t) ||
          /^\d+\.\s+.*\b(MUST|SHALL|SHOULD)\b/i.test(t))
      ) {
        const cleaned = t.replace(/^[-*\d.]+\s*/, '').replace(/\s+/g, ' ');
        if (cleaned.length > 12) out.push(cleaned.slice(0, 240));
      }
    }
  }
  return out;
}

function isTableSeparatorOrNoise(line: string): boolean {
  const t = line.trim();
  if (t.length < 4) return true;
  if (/^[\s\-:|]+$/i.test(t)) return true;
  if (/^\|?[\s\-:|]+\|?$/.test(t)) return true;
  return false;
}

function collectRiskLines(docs: SpecDocument[], max: number): string[] {
  const out: string[] = [];
  for (const d of docs) {
    const m = d.content.match(/##\s+Risks?\s*([^\n]*)\s*\n+([\s\S]*?)(?=\n##\s|$)/i);
    if (!m) continue;
    const body = m[2];
    for (const line of body.split('\n')) {
      const t = line.trim();
      if (out.length >= max) break;
      if (isTableSeparatorOrNoise(t)) continue;
      if (!/[a-zá-úñ]/i.test(t)) continue;
      if (/^[-*]\s+/.test(t) || /^\|\s*[^|]+\|/.test(t)) {
        let cleaned = t.replace(/^\|\s*/, '').replace(/\s*\|\s*$/, '').slice(0, 220);
        if (!isTableSeparatorOrNoise(cleaned)) {
          if (cleaned.includes('|') && !cleaned.startsWith('|')) {
            const cells = cleaned.split('|').map(c => c.trim()).filter(Boolean);
            if (cells.length >= 2) cleaned = `${cells[0]} — ${cells.slice(1).join(' ')}`.slice(0, 220);
          }
          out.push(cleaned);
        }
      }
    }
  }
  return out;
}

function synthesizeSpecImpact(docs: SpecDocument[], codeRefs: string[]): string {
  if (docs.length === 0) {
    return '_No se encontraron `.md` en el directorio del cambio._';
  }

  const lines: string[] = [];
  lines.push('### Qué cambia (síntesis por documento)');
  lines.push('');
  for (const d of docs) {
    lines.push(`- **\`${d.relativePath}\`** — ${docBlurb(d)}`);
  }

  const uniqRefs = [...new Set(codeRefs)].sort();
  if (uniqRefs.length) {
    lines.push('');
    lines.push('### Archivos de código mencionados en la documentación');
    lines.push(
      uniqRefs.map(f => `- \`${f}\` — revisar acoplamiento e imports antes de tocar.`).join('\n')
    );
  }

  const norms = collectNormativeLines(docs, 14);
  if (norms.length) {
    lines.push('');
    lines.push('### Exigencias normativas (MUST / SHALL / SHOULD) detectadas');
    for (const n of norms) lines.push(`- ${n}`);
  }

  const risks = collectRiskLines(docs, 10);
  if (risks.length) {
    lines.push('');
    lines.push('### Riesgos o mitigaciones citados en proposal/design');
    for (const r of risks) lines.push(`- ${r}`);
  }

  lines.push('');
  lines.push('### Conclusión para implementación');
  if (uniqRefs.length === 0) {
    lines.push(
      '- El spec no referencia rutas `src/...` concretas: el impacto en código es inferido solo por el grafo del repo; confirma puntos de registro (router, servidor) en el diseño.'
    );
  } else {
    lines.push(
      `- Prioriza tocar en este orden los módulos listados en **Análisis de dependencias** alineándolos con: ${uniqRefs
        .slice(0, 5)
        .map(f => `\`${f}\``)
        .join(', ')}${uniqRefs.length > 5 ? ', …' : ''}.`
    );
  }
  if (norms.some(n => /SHALL|MUST/i.test(n))) {
    lines.push(
      '- Hay requisitos SHALL/MUST explícitos: cubre cada uno con test o verificación reproducible antes de dar por cerrado el cambio.'
    );
  }

  lines.push('');
  lines.push(
    `_Fuente del análisis narrativo: ${docs.map(d => `\`${d.relativePath}\``).join(', ')} (no se vuelcan los cuerpos completos)._`
  );

  return lines.join('\n');
}

function generateReport(
  featureName: string,
  impact: ImpactResult,
  tasks: { name: string; done: boolean }[],
  narrative: string,
  specDocuments: SpecDocument[]
): string {
  const riskEmoji = impact.riskLevel === 'HIGH' ? '🔴' : impact.riskLevel === 'MEDIUM' ? '🟡' : '🟢';

  return `# Impact Report: ${featureName}

## Risk Score: ${impact.riskScore}/10 ${riskEmoji} (${impact.riskLevel})

## Análisis a partir de los specs (resumido)

${narrative}

## Análisis de dependencias en código

### Affected Modules

| Module | Coupling | Risk | Tests at Risk |
|---|---|---|---|
${impact.affectedModules.map(m =>
    `| ${m.path} | ${m.coupling} | ${m.risk === 'HIGH' ? '🔴' : m.risk === 'MEDIUM' ? '🟡' : '🟢'} | ${m.testsAtRisk} |`
  ).join('\n')}

### Recommended Implementation Order

${impact.recommendedOrder.length > 0
    ? impact.recommendedOrder.map((f, i) => `${i + 1}. ${f}`).join('\n')
    : 'No files referenced in spec.'}

### Breaking Change Predictions

${impact.breakingChanges.length > 0
    ? impact.breakingChanges.map(b => `- ${b}`).join('\n')
    : 'No breaking changes predicted.'}

### Tasks Status

${tasks.length > 0
    ? tasks.map(t => `- [${t.done ? 'x' : ' '}] ${t.name}`).join('\n')
    : 'No tasks found.'}

### Documentos considerados (${specDocuments.length})

${specDocuments.map(d => `- \`${d.relativePath}\``).join('\n')}
`;
}
