import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import { TestCase, AffectedModule, ImpactResult } from './types.js';

export class ASTUtils {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async findTestFiles(): Promise<string[]> {
    const patterns = [
      'src/**/*.test.ts',
      'src/**/*.test.js',
      'src/**/*.spec.ts',
      'src/**/*.spec.js',
      'src/**/__tests__/**/*.ts',
      'src/**/__tests__/**/*.js',
      'tests/**/*.ts',
      'tests/**/*.js'
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: this.projectRoot });
      files.push(...matches);
    }
    return [...new Set(files)];
  }

  async findSourceFiles(): Promise<string[]> {
    const patterns = ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx'];
    const files = (
      await Promise.all(patterns.map(p => glob(p, { cwd: this.projectRoot })))
    ).flat();
    return [...new Set(files)].filter(
      f =>
        !f.includes('.test.') &&
        !f.includes('.spec.') &&
        !f.includes('__tests__')
    );
  }

  extractTests(filePath: string): TestCase[] {
    const fullPath = join(this.projectRoot, filePath);
    if (!existsSync(fullPath)) return [];

    const content = readFileSync(fullPath, 'utf-8');
    const tests: TestCase[] = [];

    const testRegex = /\b(?:test|it)\s*\(\s*['"`](.+?)['"`]/g;
    let match;

    while ((match = testRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const bodyStart = match.index;
      const bodyEnd = this.findBlockEnd(content, bodyStart);

      tests.push({
        name: match[1],
        file: filePath,
        line,
        body: content.substring(bodyStart, bodyEnd),
        assertions: this.extractAssertions(content.substring(bodyStart, bodyEnd))
      });
    }

    return tests;
  }

  extractImports(filePath: string): string[] {
    const fullPath = join(this.projectRoot, filePath);
    if (!existsSync(fullPath)) return [];

    const content = readFileSync(fullPath, 'utf-8');
    const imports: string[] = [];

    const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  async analyzeImpact(filesReferenced: string[]): Promise<ImpactResult> {
    const affectedModules: AffectedModule[] = [];

    for (const file of filesReferenced) {
      const allFiles = await this.findSourceFiles();
      const testFiles = await this.findTestFiles();

      const fileStem = file.replace(/\.(tsx?|jsx?)$/i, '');
      const importers = allFiles.filter(f => {
        const imports = this.extractImports(f);
        return imports.some(imp => imp.includes(fileStem));
      });

      const testImporters = testFiles.filter(f => {
        const imports = this.extractImports(f);
        return imports.some(imp => imp.includes(fileStem));
      });

      const coupling: AffectedModule['coupling'] =
        importers.length > 5 ? 'HIGH' : importers.length > 2 ? 'MEDIUM' : 'LOW';
      const risk: AffectedModule['risk'] = coupling;

      affectedModules.push({
        path: file,
        coupling,
        risk,
        testsAtRisk: testImporters.length
      });
    }

    const riskScore = this.calculateRiskScore(affectedModules);

    return {
      riskScore,
      riskLevel: riskScore > 7 ? 'HIGH' : riskScore > 4 ? 'MEDIUM' : 'LOW',
      affectedModules,
      recommendedOrder: affectedModules
        .sort((a, b) => {
          const order = { LOW: 0, MEDIUM: 1, HIGH: 2 };
          return order[a.coupling] - order[b.coupling];
        })
        .map(m => m.path),
      breakingChanges: affectedModules
        .filter(m => m.risk === 'HIGH')
        .map(m => `Changes to ${m.path} may break ${m.testsAtRisk} dependent modules`),
      testsAtRisk: affectedModules.flatMap(m =>
        Array(m.testsAtRisk).fill(`${m.path} tests`)
      )
    };
  }

  private extractAssertions(body: string): string[] {
    const assertions: string[] = [];
    const assertRegex = /(?:expect|assert\.(?:strictEqual|deepEqual|ok))\s*\(/g;
    let match;
    while ((match = assertRegex.exec(body)) !== null) {
      assertions.push(match[0]);
    }
    return assertions;
  }

  private findBlockEnd(content: string, start: number): number {
    let depth = 0;
    let started = false;
    for (let i = start; i < content.length; i++) {
      if (content[i] === '{') { depth++; started = true; }
      if (content[i] === '}') { depth--; }
      if (started && depth === 0) return i + 1;
    }
    return content.length;
  }

  private calculateRiskScore(modules: AffectedModule[]): number {
    if (modules.length === 0) return 0;
    const scores = modules.map(m => {
      const couplingScore = { LOW: 1, MEDIUM: 3, HIGH: 5 };
      return couplingScore[m.coupling] + (m.testsAtRisk * 0.5);
    });
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 10) / 10;
  }
}
