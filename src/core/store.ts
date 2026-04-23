import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export class Store {
  private toolsDir: string;

  constructor(projectRoot: string = process.cwd()) {
    this.toolsDir = join(projectRoot, 'sdd-tools');
  }

  ensureDir(...pathSegments: string[]): string {
    const dir = join(this.toolsDir, ...pathSegments);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  write(feature: string, filename: string, content: string): string {
    const filePath = join(this.toolsDir, feature, filename);
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  writeSubDir(feature: string, subDir: string, filename: string, content: string): string {
    const dir = this.ensureDir(feature, subDir);
    const filePath = join(dir, filename);
    writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  read(feature: string, filename: string): string | null {
    const filePath = join(this.toolsDir, feature, filename);
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, 'utf-8');
  }

  readSubDir(feature: string, subDir: string, filename: string): string | null {
    const filePath = join(this.toolsDir, feature, subDir, filename);
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, 'utf-8');
  }

  listFiles(feature: string, subDir: string = ''): string[] {
    const dir = join(this.toolsDir, feature, subDir);
    if (!existsSync(dir)) return [];
    return readdirSync(dir);
  }

  writeYaml(feature: string, filename: string, data: unknown): string {
    return this.write(feature, filename, stringifyYaml(data));
  }

  readYaml<T>(feature: string, filename: string): T | null {
    const content = this.read(feature, filename);
    if (!content) return null;
    return parseYaml(content) as T;
  }

  writeGlobal(filename: string, content: string): string {
    return this.write('global', filename, content);
  }

  writeDebt(filename: string, content: string): string {
    return this.write('debt', filename, content);
  }

  writeDebtHistory(filename: string, content: string): string {
    return this.writeSubDir('debt', 'history', filename, content);
  }
}
