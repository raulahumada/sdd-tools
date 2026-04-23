import { Store } from '../core/store.js';
import { GitUtils } from '../core/git-utils.js';
import { SpecParser } from '../core/spec-parser.js';
import { SkillResult, Session } from '../core/types.js';
import { join } from 'path';

export async function contextSkill(
  args: string[],
  projectRoot: string = process.cwd()
): Promise<SkillResult> {
  const [action, ...rest] = args;

  if (action === 'save') return save(rest, projectRoot);
  if (action === 'load') return load(rest, projectRoot);
  if (action === 'list') return list(rest, projectRoot);

  return { success: false, message: 'Usage: sdd-kit context save|load|list [--feature <name>]' };
}

async function save(args: string[], projectRoot: string): Promise<SkillResult> {
  const store = new Store(projectRoot);
  const git = new GitUtils(projectRoot);

  const feature = getArg(args, '--feature') || 'default';
  const label = getArg(args, '--label') || 'session';

  const parser = new SpecParser(projectRoot);
  const specs = await parser.findAllSpecs();
  const matchingSpec = specs.find(s => s.includes(feature));
  const tasks = matchingSpec ? parser.parseTasks(join(projectRoot, matchingSpec)) : [];

  const tasksCompleted = tasks.filter(t => t.done).map(t => t.name);
  const tasksPending = tasks.filter(t => !t.done).map(t => t.name);

  const decisions = store.listFiles(feature, 'decisions')
    .filter(f => f.startsWith('ADR'))
    .map(f => f.replace('.md', ''));

  const now = new Date().toISOString();
  const session: Session = {
    id: `sess_${Date.now().toString(36)}`,
    feature,
    label,
    createdAt: now,
    tasksCompleted,
    tasksPending,
    decisions,
    filesModified: git.dirtyFiles(),
    gitBranch: git.currentBranch(),
    gitHead: git.headCommit()
  };

  const date = now.split('T')[0];
  const time = now.split('T')[1].split('.')[0].replace(/:/g, '-');
  const filename = `${date}-${time}.yaml`;

  const outputPath = store.writeYaml(feature, `context/${filename}`, { session });

  console.log(`✓ Session saved to ${outputPath}`);
  console.log(`  Feature: ${feature}`);
  console.log(`  Tasks: ${tasksCompleted.length}/${tasksCompleted.length + tasksPending.length} done`);

  return {
    success: true,
    message: `Session saved: ${tasksCompleted.length}/${tasksCompleted.length + tasksPending.length} tasks done`,
    outputPath
  };
}

async function load(args: string[], projectRoot: string): Promise<SkillResult> {
  const store = new Store(projectRoot);
  const feature = getArg(args, '--feature') || 'default';

  const sessions = store.listFiles(feature, 'context')
    .filter(f => f.endsWith('.yaml'))
    .sort()
    .reverse();

  if (sessions.length === 0) {
    console.log('No previous sessions found.');
    return { success: true, message: 'No previous sessions found' };
  }

  const latest = store.readYaml<{ session: Session }>(feature, `context/${sessions[0]}`);
  if (!latest) return { success: false, message: 'Could not read session file' };

  const s = latest.session;
  console.log(`\n## Session Context: ${s.feature}\n`);
  console.log(`**Last worked:** ${s.label}`);
  console.log(`**Branch:** ${s.gitBranch}`);
  console.log(`**Last commit:** ${s.gitHead || 'unknown'}`);
  console.log(`\n### Tasks Completed (${s.tasksCompleted.length})`);
  s.tasksCompleted.forEach(t => console.log(`- ✅ ${t}`));
  console.log(`\n### Tasks Pending (${s.tasksPending.length})`);
  s.tasksPending.forEach(t => console.log(`- ⬜ ${t}`));
  console.log(`\n### Decisions Made`);
  s.decisions.forEach(d => console.log(`- ${d}`));

  return { success: true, message: `Loaded session: ${s.label}` };
}

async function list(args: string[], projectRoot: string): Promise<SkillResult> {
  const store = new Store(projectRoot);
  const feature = getArg(args, '--feature');

  if (feature) {
    const sessions = store.listFiles(feature, 'context')
      .filter(f => f.endsWith('.yaml'));

    console.log(`Sessions for ${feature}:`);
    for (const s of sessions) {
      const data = store.readYaml<{ session: Session }>(feature, `context/${s}`);
      if (data) {
        console.log(`  ${s} — ${data.session.label} (${data.session.tasksCompleted.length} tasks done)`);
      }
    }
  } else {
    console.log('No sessions found. Use --feature to specify.');
  }

  return { success: true, message: 'Listed sessions' };
}

function getArg(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return null;
  return args[index + 1];
}
