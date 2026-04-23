import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

const VALID_SKILLS = ['impact', 'context', 'decisions', 'review', 'testgap', 'debt', 'handoff'];

export async function removeSkill(skill: string, projectRoot: string): Promise<void> {
  if (!VALID_SKILLS.includes(skill)) {
    console.error(chalk.red(`Unknown skill: ${skill}`));
    console.error(`Valid skills: ${VALID_SKILLS.join(', ')}`);
    process.exit(1);
  }

  const configPath = join(projectRoot, 'sdd.config.yaml');
  if (!existsSync(configPath)) {
    console.error(chalk.red('sdd-tools not initialized. Run "npx sdd-tools init" first.'));
    process.exit(1);
  }

  // Leer config actual
  const configContent = readFileSync(configPath, 'utf-8');

  // Verificar si ya está deshabilitado
  if (configContent.includes(`    ${skill}: { enabled: false`)) {
    console.log(chalk.yellow(`Skill "${skill}" is already disabled.`));
    return;
  }

  // Actualizar config: cambiar enabled: true a enabled: false
  const updated = configContent.replace(
    new RegExp(`    ${skill}: \\{ enabled: true`),
    `    ${skill}: { enabled: false`
  );
  writeFileSync(configPath, updated);

  // Eliminar command .mdc
  const commandPath = join(projectRoot, '.cursor', 'commands', `sdd-${skill}.mdc`);
  if (existsSync(commandPath)) {
    unlinkSync(commandPath);
    console.log(chalk.green(`  ✓`) + ` Deleted .cursor/commands/sdd-${skill}.mdc`);
  }

  // Actualizar rules
  updateRules(projectRoot, skill);

  console.log(chalk.green(`✓ Removed sdd-${skill} skill`));
  console.log(chalk.dim('  Note: sdd-tools/ data preserved. Delete manually if not needed.'));
  console.log(chalk.dim('  Restart your IDE to unload the skill.'));
}

function updateRules(projectRoot: string, skill: string): void {
  const rulesPath = join(projectRoot, '.cursor', 'rules', 'sdd-skills.mdc');
  if (!existsSync(rulesPath)) return;

  let content = readFileSync(rulesPath, 'utf-8');

  // Buscar y eliminar la sección del skill
  const titles: Record<string, string> = {
    impact: 'Impact Analysis',
    context: 'Session Context',
    decisions: 'Decision Capture',
    review: 'Pre-Review',
    testgap: 'Test Gap Analysis',
    debt: 'Debt Tracking',
    handoff: 'Handoff'
  };

  const title = titles[skill] || skill;
  const sectionRegex = new RegExp(
    `---\\n## Skill: ${title}[\\s\\S]*?(?=\\n---\\n## Skill:|$)`,
    'g'
  );

  if (sectionRegex.test(content)) {
    content = content.replace(sectionRegex, '');
    writeFileSync(rulesPath, content);
    console.log(chalk.green(`  ✓`) + ` Updated .cursor/rules/sdd-skills.mdc`);
  }
}
