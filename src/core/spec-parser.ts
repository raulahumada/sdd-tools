import { readFileSync, existsSync } from 'fs';
import { join, relative, sep } from 'path';
import { glob } from 'glob';
import { Requirement } from './types.js';

export class SpecParser {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Convierte una entrada devuelta por findAllSpecs (p. ej. `.../proposal.md`)
   * en el directorio del cambio donde vive `tasks.md`.
   */
  resolveSpecDirectory(specEntryPath: string): string {
    const n = specEntryPath.replace(/\\/g, '/').replace(/\/+$/, '');
    if (n.toLowerCase().endsWith('.md')) {
      const parts = n.split('/');
      parts.pop();
      return parts.join('/') || '.';
    }
    return n;
  }

  /** Requisitos MUST/SHALL/SHOULD de proposal.md y de cada spec.md anidado bajo el directorio del cambio OpenSpec. */
  async parseRequirementsFromChange(specDirRel: string): Promise<Requirement[]> {
    const base = join(this.projectRoot, specDirRel);
    if (!existsSync(base)) return [];

    const files = new Set<string>();
    const proposalPath = join(base, 'proposal.md');
    if (existsSync(proposalPath)) files.add(proposalPath);

    const nested = await glob('**/spec.md', { cwd: base });
    for (const rel of nested) {
      files.add(join(base, rel));
    }

    const ordered = [...files].sort();
    let idx = 0;
    const requirements: Requirement[] = [];

    for (const filePath of ordered) {
      for (const r of this.parseRequirements(filePath)) {
        idx++;
        requirements.push({ ...r, id: `req-${String(idx).padStart(3, '0')}` });
      }
    }

    return requirements;
  }

  /** Ruta relativa al proyecto (con `/`) para evitar path.join(cwd, abs) roto en Windows. */
  private toProjectRelative(absolutePath: string): string {
    let rel = relative(this.projectRoot, absolutePath);
    if (sep === '\\') rel = rel.replace(/\\/g, '/');
    return rel;
  }

  async findSpec(specPath: string): Promise<string> {
    const normalized = specPath.replace(/\\/g, '/').replace(/\/+$/, '');
    const fullPath = join(this.projectRoot, normalized);
    if (existsSync(fullPath)) return this.toProjectRelative(fullPath);

    // Buscar en specs/
    const specsDir = join(this.projectRoot, 'specs');
    const matches = await glob(`${specsDir}/**/${specPath}*`);
    if (matches.length > 0) return this.toProjectRelative(matches[0]);

    // Buscar en openspec/changes/
    const changesDir = join(this.projectRoot, 'openspec', 'changes');
    const changeMatches = await glob(`${changesDir}/**/${specPath}*`);
    if (changeMatches.length > 0) return this.toProjectRelative(changeMatches[0]);

    // Buscar en openspec/specs/
    const openspecDir = join(this.projectRoot, 'openspec', 'specs');
    const openspecMatches = await glob(`${openspecDir}/**/${specPath}*`);
    if (openspecMatches.length > 0) return this.toProjectRelative(openspecMatches[0]);

    throw new Error(`Spec not found: ${specPath}`);
  }

  // Buscar el archivo de spec en un directorio (soporta OpenSpec y markdown)
  findSpecFile(specDir: string): string | null {
    // Buscar en orden de prioridad
    const candidates = ['spec.md', 'proposal.md'];

    for (const candidate of candidates) {
      const filePath = join(this.projectRoot, specDir, candidate);
      if (existsSync(filePath)) return filePath;
    }

    return null;
  }

  parseRequirements(specPath: string): Requirement[] {
    const content = readFileSync(specPath, 'utf-8');
    const requirements: Requirement[] = [];
    let currentSection = 'General';
    let reqIndex = 0;

    for (const line of content.split('\n')) {
      const headingMatch = line.match(/^#{1,3}\s+(.+)/);
      if (headingMatch) {
        currentSection = headingMatch[1].trim();
        continue;
      }

      // Detectar requirements con MUST/SHALL/SHOULD
      const reqMatch = line.match(/^[-*]\s+.*?(MUST|SHALL|SHOULD)\s+(.+)/i);
      if (reqMatch) {
        reqIndex++;
        const text = reqMatch[0].replace(/^[-*]\s+/, '').trim();
        requirements.push({
          id: `req-${String(reqIndex).padStart(3, '0')}`,
          text,
          keywords: this.extractKeywords(text),
          section: currentSection
        });
      }
    }

    return requirements;
  }

  parseTasks(specDir: string): { name: string; done: boolean }[] {
    const tasksPath = join(this.projectRoot, specDir, 'tasks.md');
    if (!existsSync(tasksPath)) return [];

    const content = readFileSync(tasksPath, 'utf-8');
    const tasks: { name: string; done: boolean }[] = [];

    for (const line of content.split('\n')) {
      // Formato estándar: - [x] Task description  o  - [ ] Task
      const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)/);
      if (taskMatch) {
        tasks.push({
          name: taskMatch[2].trim(),
          done: taskMatch[1].toLowerCase() === 'x'
        });
      }
    }

    return tasks;
  }

  async findAllSpecs(): Promise<string[]> {
    const results: string[] = [];

    // Buscar en specs/
    const specsDir = join(this.projectRoot, 'specs');
    if (existsSync(specsDir)) {
      const specFiles = await glob(`${specsDir}/**/spec.md`);
      results.push(...specFiles.map(f => this.toProjectRelative(f)));
    }

    // Buscar en openspec/changes/
    const changesDir = join(this.projectRoot, 'openspec', 'changes');
    if (existsSync(changesDir)) {
      const proposalFiles = await glob(`${changesDir}/**/proposal.md`);
      results.push(...proposalFiles.map(f => this.toProjectRelative(f)));
    }

    // Buscar en openspec/specs/
    const openspecDir = join(this.projectRoot, 'openspec', 'specs');
    if (existsSync(openspecDir)) {
      const specFiles = await glob(`${openspecDir}/**/spec.md`);
      results.push(...specFiles.map(f => this.toProjectRelative(f)));
    }

    return results;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'shall', 'must',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'and', 'or', 'but', 'not', 'if', 'then', 'than', 'that', 'this'
      //add spanish stop words
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
  }
}
