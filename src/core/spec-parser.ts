import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import { Requirement } from './types.js';

export class SpecParser {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async findSpec(specPath: string): Promise<string> {
    const fullPath = join(this.projectRoot, specPath);
    if (existsSync(fullPath)) return fullPath;

    const specsDir = join(this.projectRoot, 'specs');
    const matches = await glob(`${specsDir}/**/${specPath}*`);
    if (matches.length > 0) return matches[0];

    throw new Error(`Spec not found: ${specPath}`);
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
    const tasksPath = join(specDir, 'tasks.md');
    if (!existsSync(tasksPath)) return [];

    const content = readFileSync(tasksPath, 'utf-8');
    const tasks: { name: string; done: boolean }[] = [];

    for (const line of content.split('\n')) {
      const taskMatch = line.match(/^[-*]\s+$$([ x])$$\s+(.+)/i);
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
    const specsDir = join(this.projectRoot, 'specs');
    if (!existsSync(specsDir)) return [];

    const specFiles = await glob(`${specsDir}/**/spec.md`);
    return specFiles.map(f => f.replace(this.projectRoot + '/', ''));
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'shall', 'must',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'and', 'or', 'but', 'not', 'if', 'then', 'than', 'that', 'this'
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
  }
}
