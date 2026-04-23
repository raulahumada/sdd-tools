import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { CURSOR_RULES } from '../templates/cursor/rules/sdd-skills.js';
import { CURSOR_SKILLS } from '../templates/cursor/skills/index.js';
import { CURSOR_COMMANDS } from '../templates/cursor/commands/index.js';

interface InitOptions {
  ide?: string;
  specs?: string;
  format?: string;
  all?: boolean;
  force?: boolean;
}

const IDE_CHOICES = [
  { name: 'Cursor', value: 'cursor' },
  new inquirer.Separator('Coming soon:'),
  { name: 'VS Code + Copilot', value: 'vscode', disabled: 'Not available yet' },
  { name: 'Claude Code', value: 'claude-code', disabled: 'Not available yet' },
  { name: 'Windsurf', value: 'windsurf', disabled: 'Not available yet' },
  { name: 'JetBrains AI', value: 'jetbrains', disabled: 'Not available yet' },
];

const AVAILABLE_TOOLS = [
  { name: 'Impact Analysis      — Know what breaks before implementing', value: 'impact', checked: true },
  { name: 'Session Context      — Save/restore where you left off', value: 'context', checked: true },
  { name: 'Decision Capture     — Auto-save architectural decisions', value: 'decisions', checked: true },
  { name: 'Pre-Review           — Catch issues before human review', value: 'review', checked: true },
  { name: 'Test Gap Analysis    — Verify spec requirements have tests', value: 'testgap', checked: true },
  { name: 'Debt Tracking        — Monitor codebase health over time', value: 'debt', checked: true },
  { name: 'Agent Handoff        — Transfer context between agents', value: 'handoff', checked: true },
];

const AVAILABLE_SPECS = [
  { name: 'openspec/changes/ (OpenSpec change proposals)', value: 'openspec/changes' },
  { name: 'openspec/specs/ (OpenSpec locked specs)', value: 'openspec/specs' },
  { name: 'Custom path…', value: 'custom' },
];

const AVAILABLE_FORMATS = [
  { name: 'Markdown (## headings)', value: 'markdown' },
  { name: 'OpenSpec layout (proposal / spec deltas)', value: 'openspec' },
];

export async function initProject(projectRoot: string, opts: InitOptions): Promise<void> {
  console.log('');
  console.log(chalk.bold('╔══════════════════════════════════════╗'));
  console.log(chalk.bold('║  SDD-Tools — Spec-Driven Development ║'));
  console.log(chalk.bold('╚══════════════════════════════════════╝'));
  console.log('');

  // ─── Gather answers ───

  let ide = opts.ide;
  let specsDir = opts.specs;
  let specFormat = opts.format;
  let enabledTools: string[] = [];

  if (opts.all) {
    enabledTools = AVAILABLE_TOOLS.map(t => t.value);
  }

  if (ide && ide !== 'cursor') {
    console.log(chalk.yellow('Only Cursor is supported for now; using cursor.'));
    ide = 'cursor';
  }

  if (!ide) {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'ide',
      message: 'Which IDE are you setting up?',
      choices: IDE_CHOICES,
    }]);
    ide = answer.ide;
  }

  if (!specsDir) {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'specs',
      message: 'Where are your specs? (suggested OpenSpec paths or custom)',
      choices: AVAILABLE_SPECS,
    }]);
    specsDir = answer.specs;

    if (specsDir === 'custom') {
      const custom = await inquirer.prompt([{
        type: 'input',
        name: 'path',
        message: 'Specs directory path (relative to project root):',
        default: 'openspec/changes',
      }]);
      specsDir = custom.path.replace(/\\/g, '/').replace(/\/?$/, '') || 'openspec/changes';
    }
  }

  if (!specFormat) {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'format',
      message: 'Spec format?',
      choices: AVAILABLE_FORMATS,
    }]);
    specFormat = answer.format;
  } else if (specFormat !== 'markdown' && specFormat !== 'openspec') {
    console.log(chalk.yellow(`Unknown --format "${specFormat}"; using openspec.`));
    specFormat = 'openspec';
  }

  if (enabledTools.length === 0) {
    const answer = await inquirer.prompt([{
      type: 'checkbox',
      name: 'tools',
      message: 'Which tools do you want to enable?',
      choices: AVAILABLE_TOOLS,
    }]);
    enabledTools = answer.tools;
  }

  console.log('');
  console.log(chalk.dim('Setting up sdd-tools...'));
  console.log('');

  // ─── Create files ───

  const force = opts.force || false;

  // IDE templates
  if (ide === 'cursor') {
    await setupCursor(projectRoot, enabledTools, force);
  }

  // sdd-tools directories
  createSddToolsDirs(projectRoot, enabledTools);

  // sdd.config.yaml
  createConfig(projectRoot, ide!, specsDir!, specFormat!, enabledTools);

  // .gitignore
  updateGitignore(projectRoot);

  // ─── Done ───

  console.log(chalk.green('Done!') + ' Restart your IDE to load SDD skills.');
  console.log('');
  console.log(chalk.dim('Quick start:'));
  console.log(chalk.dim('  /sdd-impact feature-name    → Analyze impact'));
  console.log(chalk.dim('  /sdd-context save           → Save session'));
  console.log(chalk.dim('  /sdd-debt scan              → Check health'));
  console.log('');
  console.log(chalk.dim('Or just say "implement specs/feature-name/"'));
  console.log(chalk.dim('and skills will trigger automatically.'));
  console.log('');
}

async function setupCursor(
  projectRoot: string,
  enabledTools: string[],
  force: boolean
): Promise<void> {
  // Rules
  const rulesDir = join(projectRoot, '.cursor', 'rules');
  mkdirSync(rulesDir, { recursive: true });

  const rulesPath = join(rulesDir, 'sdd-skills.mdc');
  if (!existsSync(rulesPath) || force) {
    writeFileSync(rulesPath, CURSOR_RULES(enabledTools));
    console.log(chalk.green('  ✓') + ' Created .cursor/rules/sdd-skills.mdc');
  } else {
    console.log(chalk.yellow('  ⚠') + ' .cursor/rules/sdd-skills.mdc (already exists, skipped)');
  }

  // Commands (.cursor/commands/sdd-<tool>.mdc)
  const commandsDir = join(projectRoot, '.cursor', 'commands');
  mkdirSync(commandsDir, { recursive: true });

  for (const tool of enabledTools) {
    const commandContent = CURSOR_COMMANDS[tool];
    if (!commandContent) continue;

    const commandPath = join(commandsDir, `sdd-${tool}.mdc`);
    if (!existsSync(commandPath) || force) {
      writeFileSync(commandPath, commandContent);
      console.log(chalk.green('  ✓') + ` Created .cursor/commands/sdd-${tool}.mdc`);
    } else {
      console.log(chalk.yellow('  ⚠') + ` .cursor/commands/sdd-${tool}.mdc (already exists, skipped)`);
    }
  }

  // Skills (.cursor/skills/sdd-<tool>/SKILL.md)
  const skillsDir = join(projectRoot, '.cursor', 'skills');

  for (const tool of enabledTools) {
    const skillContent = CURSOR_SKILLS[tool];
    if (!skillContent) continue;

    const skillDir = join(skillsDir, `sdd-${tool}`);
    mkdirSync(skillDir, { recursive: true });

    const skillPath = join(skillDir, 'SKILL.md');
    if (!existsSync(skillPath) || force) {
      writeFileSync(skillPath, skillContent);
      console.log(chalk.green('  ✓') + ` Created .cursor/skills/sdd-${tool}/SKILL.md`);
    } else {
      console.log(chalk.yellow('  ⚠') + ` .cursor/skills/sdd-${tool}/SKILL.md (already exists, skipped)`);
    }
  }
}


function createSddToolsDirs(projectRoot: string, enabledTools: string[]): void {
  const toolsDir = join(projectRoot, 'sdd-tools');

  // Always create global and debt dirs
  const dirs = ['global', 'debt', 'debt/history'];

  // Add dirs for enabled tools
  for (const tool of enabledTools) {
    if (tool === 'debt') continue; // already added
    dirs.push(tool);
    if (tool === 'decisions') dirs.push('decisions');
    if (tool === 'context') dirs.push('context');
  }

  for (const dir of dirs) {
    const fullPath = join(toolsDir, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }

  console.log(chalk.green('  ✓') + ' Created sdd-tools/ directories');
}

function createConfig(
  projectRoot: string,
  ide: string,
  specsDir: string,
  specFormat: string,
  enabledTools: string[]
): void {
  const configPath = join(projectRoot, 'sdd.config.yaml');
  if (existsSync(configPath)) {
    console.log(chalk.yellow('  ⚠') + ' sdd.config.yaml (already exists, skipped)');
    return;
  }

  const allTools = ['impact', 'context', 'decisions', 'review', 'testgap', 'debt', 'handoff'];
  const toolsConfig = allTools.map(tool => {
    const enabled = enabledTools.includes(tool);
    const autoTrigger = tool !== 'handoff';
    return `    ${tool}: { enabled: ${enabled}, auto_trigger: ${autoTrigger} }`;
  }).join('\n');

  const content = `sdd:
  specs_dir: "${specsDir}"
  output_dir: "sdd-tools"
  spec_format: "${specFormat}"
  ide: "${ide}"

  tools:
${toolsConfig}
`;

  writeFileSync(configPath, content);
  console.log(chalk.green('  ✓') + ' Created sdd.config.yaml');
}

function updateGitignore(projectRoot: string): void {
  const gitignorePath = join(projectRoot, '.gitignore');
  const entry = '\n# SDD Tools\nsdd-tools/\n';

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    if (!content.includes('sdd-tools/')) {
      writeFileSync(gitignorePath, content + entry);
      console.log(chalk.green('  ✓') + ' Updated .gitignore');
    } else {
      console.log(chalk.dim('  .') + ' .gitignore (sdd-tools/ already ignored)');
    }
  } else {
    writeFileSync(gitignorePath, entry.trim());
    console.log(chalk.green('  ✓') + ' Created .gitignore');
  }
}