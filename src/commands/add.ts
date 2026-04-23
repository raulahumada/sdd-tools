import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { CURSOR_COMMANDS } from '../templates/cursor/commands/index.js';
import { CURSOR_SKILLS } from '../templates/cursor/skills/index.js';

const VALID_SKILLS = ['impact', 'context', 'decisions', 'review', 'testgap', 'debt', 'handoff'];

export async function addSkill(skill: string, projectRoot: string): Promise<void> {
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

  // Verificar si ya está habilitado
  if (configContent.includes(`    ${skill}: { enabled: true`)) {
    console.log(chalk.yellow(`Skill "${skill}" is already enabled.`));
    return;
  }

  // Actualizar config: cambiar enabled: false a enabled: true
  const updated = configContent.replace(
    new RegExp(`    ${skill}: \\{ enabled: false`),
    `    ${skill}: { enabled: true`
  );
  writeFileSync(configPath, updated);

  // Crear command .mdc si no existe
  const skillDir = join(projectRoot, '.cursor', 'skills', `sdd-${skill}`);
  mkdirSync(skillDir, { recursive: true });
  const skillPath = join(skillDir, 'SKILL.md');
  
  if (!existsSync(skillPath) &&  CURSOR_SKILLS[skill]) {
    writeFileSync(skillPath, CURSOR_SKILLS[skill]);
    console.log(chalk.green(`  ✓`) + ` Created .cursor/skills/sdd-${skill}/SKILL.md`);
  }
  // Crear directorio en sdd-tools si no existe
  const toolsDir = join(projectRoot, 'sdd-tools', skill);
  if (!existsSync(toolsDir)) {
    mkdirSync(toolsDir, { recursive: true });
    console.log(chalk.green(`  ✓`) + ` Created sdd-tools/${skill}/`);
  }

  // Actualizar rules
  updateRules(projectRoot, skill, true);

  console.log(chalk.green(`✓ Added sdd-${skill} skill`));
  console.log(chalk.dim('  Restart your IDE to load the new skill.'));
}

function updateRules(projectRoot: string, skill: string, enabled: boolean): void {
  const rulesPath = join(projectRoot, '.cursor', 'rules', 'sdd-skills.mdc');
  if (!existsSync(rulesPath)) return;

  let content = readFileSync(rulesPath, 'utf-8');

  if (enabled) {
    // Agregar sección del skill si no existe
    const skillSection = getSkillSection(skill);
    if (skillSection && !content.includes(`## Skill: ${getSkillTitle(skill)}`)) {
      content += '\n---\n' + skillSection;
      writeFileSync(rulesPath, content);
      console.log(chalk.green(`  ✓`) + ` Updated .cursor/rules/sdd-skills.mdc`);
    }
  }
}

function getSkillTitle(skill: string): string {
  const titles: Record<string, string> = {
    impact: 'Impact Analysis',
    context: 'Session Context',
    decisions: 'Decision Capture',
    review: 'Pre-Review',
    testgap: 'Test Gap Analysis',
    debt: 'Debt Tracking',
    handoff: 'Handoff'
  };
  return titles[skill] || skill;
}

function getSkillSection(skill: string): string {
  const sections: Record<string, string> = {
    impact: `## Skill: Impact Analysis (BEFORE implementing)

### When to trigger
- User asks you to implement a feature from \`specs/\`

### How to execute
1. Run: \`npx sdd-tools impact analyze specs/<feature-name>/\`
2. Read: \`sdd-tools/<feature-name>/impact.md\`
3. Present the analysis BEFORE starting implementation`,

    review: `## Skill: Pre-Review (AFTER each task)

### When to trigger
- You just completed a task from tasks.md

### How to execute
1. Run: \`npx sdd-tools review check specs/<feature-name>/\`
2. Read: \`sdd-tools/<feature-name>/review.md\`
3. Fix ALL errors before marking task as done`,

    testgap: `## Skill: Test Gap Analysis (AFTER writing tests)

### When to trigger
- You just finished writing a test suite

### How to execute
1. Run: \`npx sdd-tools testgap analyze specs/<feature-name>/\`
2. Read: \`sdd-tools/<feature-name>/testgap.md\`
3. If coverage < 100%, write the missing tests`,

    decisions: `## Skill: Decision Capture (WHEN making architectural choices)

### When to trigger
- You chose one pattern over another
- You added a new dependency

### How to execute
1. Run: \`npx sdd-tools decisions add --feature <feature> --title "..." --context "..." --decision "..." --consequences "..."\``,

    context: `## Skill: Session Context (WHEN starting/ending)

### When to trigger — SAVE
- User says "save where we are"

### When to trigger — LOAD
- User says "where were we?"

### How to execute
- SAVE: \`npx sdd-tools context save --feature <feature> --label "<description>"\`
- LOAD: \`npx sdd-tools context load --feature <feature>\``,

    debt: `## Skill: Debt Tracking (AFTER completing a feature)

### When to trigger
- All tasks in tasks.md are done

### How to execute
1. Run: \`npx sdd-tools debt scan\`
2. Read: \`sdd-tools/debt/report.md\``,

    handoff: `## Skill: Handoff (WHEN switching agents)

### When to trigger
- User says "handoff", "switch to <agent>"

### How to execute
- EXPORT: \`npx sdd-tools handoff export --feature <feature>\`
- IMPORT: \`npx sdd-tools handoff import --feature <feature>\``
  };

  return sections[skill] || '';
}
