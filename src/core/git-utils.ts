import { execSync } from 'child_process';

export class GitUtils {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  private run(cmd: string): string {
    try {
      return execSync(cmd, {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
    } catch {
      return '';
    }
  }

  currentBranch(): string {
    return this.run('git branch --show-current');
  }

  headCommit(): string {
    return this.run('git rev-parse --short HEAD');
  }

  dirtyFiles(): string[] {
    const output = this.run('git status --porcelain');
    if (!output) return [];
    return output.split('\n').map(line => line.slice(3)).filter(Boolean);
  }

  log(count: number = 10): { hash: string; message: string; date: string }[] {
    const output = this.run(`git log -${count} --pretty=format:"%H|%s|%ai"`);
    if (!output) return [];
    return output.split('\n').map(line => {
      const [hash, message, date] = line.split('|');
      return { hash, message, date };
    });
  }
}
