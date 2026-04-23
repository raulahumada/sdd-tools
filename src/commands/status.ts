import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { loadConfig } from '../core/config.js';
import { isOpenSpecWorkspace } from '../core/openspec-check.js';

export async function showStatus(projectRoot: string): Promise<void> {
  const configPath = join(projectRoot, 'sdd.config.yaml');

  if (!existsSync(configPath)) {
    console.log(chalk.red('sdd-tools not initialized in this project.'));
    console.log('Run: npx sdd-tools init');
    return;
  }

  const config = loadConfig(projectRoot);

  console.log('');
  console.log(chalk.bold('sdd-tools status'));
  console.log('');
  console.log(`  IDE: ${config.ide}`);
  console.log(`  Specs: ${config.specs_dir} (${config.spec_format} format)`);
  const osOk = isOpenSpecWorkspace(projectRoot);
  console.log(
    `  OpenSpec: ${osOk ? chalk.green('✓ layout (openspec/changes o openspec/specs)') : chalk.yellow('✗ no detectado')}`
  );
  if (!osOk) {
    console.log(
      chalk.dim('           → npm install -g @fission-ai/openspec@latest && openspec init')
    );
    console.log(chalk.dim('           → https://github.com/Fission-AI/OpenSpec'));
  }
  console.log('');

  console.log('  Skills:');
  for (const [name, tool] of Object.entries(config.tools)) {
    const icon = tool.enabled ? chalk.green('✓') : chalk.red('✗');
    const auto = tool.auto_trigger ? chalk.dim(' (auto)') : '';
    console.log(`    ${icon} ${name}${auto}`);
  }
  console.log('');

  console.log('  Files:');
  const files = [
    '.cursor/rules/sdd-skills.mdc',
    '.cursor/commands/',
    'sdd-tools/',
    'sdd.config.yaml'
  ];
  for (const file of files) {
    const exists = existsSync(join(projectRoot, file));
    const icon = exists ? chalk.green('✓') : chalk.red('✗');
    console.log(`    ${icon} ${file}`);
  }
  console.log('');

  // Count data files
  const toolsDir = join(projectRoot, 'sdd-tools');
  if (existsSync(toolsDir)) {
    console.log('  Data:');
    const dirs = readdirSync(toolsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'global');

    for (const dir of dirs) {
      const dirPath = join(toolsDir, dir.name);
      const count = countFiles(dirPath);
      if (count > 0) {
        console.log(`    ${dir.name}: ${count} file${count > 1 ? 's' : ''}`);
      }
    }
  }
  console.log('');
}

function countFiles(dir: string): number {
  let count = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (entry.isFile()) count++;
    }
  } catch {
    // ignore
  }
  return count;
}
