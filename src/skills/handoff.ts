import { Store } from '../core/store.js';
import { GitUtils } from '../core/git-utils.js';
import { SpecParser } from '../core/spec-parser.js';
import { SkillResult, HandoffData, Decision } from '../core/types.js';
export async function handoffSkill(
  args: string[],
  projectRoot: string = process.cwd()
): Promise<SkillResult> {
  const [action, ...rest] = args;

  if (action === 'export') return exportHandoff(rest, projectRoot);
  if (action === 'import') return importHandoff(rest, projectRoot);

  return { success: false, message: 'Usage: sdd-kit handoff export|import [--feature <name>]' };
}

async function exportHandoff(args: string[], projectRoot: string): Promise<SkillResult> {
  const store = new Store(projectRoot);
  const git = new GitUtils(projectRoot);
  const parser = new SpecParser(projectRoot);

  const feature = getArg(args, '--feature') || 'default';

  const specs = await parser.findAllSpecs();
  const matchingSpec = specs.find(s => s.includes(feature));
  const specDirForTasks = matchingSpec ? parser.resolveSpecDirectory(matchingSpec) : '';
  const tasks = matchingSpec ? parser.parseTasks(specDirForTasks) : [];

  const decisionFiles = store.listFiles(feature, 'decisions').filter(f => f.startsWith('ADR'));
  const decisions: Decision[] = [];
  for (const file of decisionFiles) {
    const content = store.readSubDir(feature, 'decisions', file);
    if (content) {
      const titleMatch = content.match(/^# .+$/m);
      decisions.push({
        id: file.match(/ADR-\d+/)?.[0] || 'unknown',
        title: titleMatch?.[0]?.replace(/^# /, '') || 'Untitled',
        context: '',
        decision: '',
        consequences: '',
        feature,
        filesAffected: [],
        createdAt: new Date().toISOString()
      });
    }
  }

  const handoff: HandoffData = {
    feature,
    exportedFrom: 'cursor',
    exportedAt: new Date().toISOString(),
    tasks: tasks.map(t => ({ name: t.name, status: t.done ? 'done' : 'pending' })),
    git: {
      branch: git.currentBranch(),
      head: git.headCommit(),
      dirtyFiles: git.dirtyFiles()
    },
    decisions,
    resolvedIssues: [],
    pending: tasks.filter(t => !t.done).map(t => t.name),
    suggestedPrompt: generateSuggestedPrompt(feature, tasks, decisions)
  };

  const outputPath = store.writeYaml(feature, 'handoff.yaml', handoff);

  console.log(`✓ Handoff exported to ${outputPath}`);
  console.log(`  Feature: ${feature}`);
  console.log(`  Tasks: ${tasks.filter(t => t.done).length}/${tasks.length} done`);
  console.log(`  Decisions: ${decisions.length}`);

  return {
    success: true,
    message: `Handoff exported: ${tasks.filter(t => t.done).length}/${tasks.length} tasks done`,
    outputPath
  };
}

async function importHandoff(args: string[], projectRoot: string): Promise<SkillResult> {
  const store = new Store(projectRoot);
  const git = new GitUtils(projectRoot);

  const feature = getArg(args, '--feature') || 'default';
  const handoff = store.readYaml<HandoffData>(feature, 'handoff.yaml');

  if (!handoff) {
    return { success: false, message: `No handoff found for ${feature}` };
  }

  const currentHead = git.headCommit();
  const headMatch = currentHead === handoff.git.head;

  console.log(`\n## Handoff Imported: ${feature}\n`);
  console.log(`**Exported from:** ${handoff.exportedFrom}`);
  console.log(`**Exported at:** ${handoff.exportedAt}`);

  if (!headMatch) {
    console.log(`\n⚠️ **Warning:** Git state doesn't match.`);
    console.log(`- Handoff head: ${handoff.git.head}`);
    console.log(`- Current head: ${currentHead}`);
  }

  console.log(`\n### Tasks`);
  handoff.tasks.forEach(t => console.log(`- [${t.status === 'done' ? 'x' : ' '}] ${t.name}`));

  console.log(`\n### Decisions (${handoff.decisions.length})`);
  handoff.decisions.forEach(d => console.log(`- **${d.id}:** ${d.title}`));

  console.log(`\n### Pending`);
  handoff.pending.forEach(p => console.log(`- ${p}`));

  console.log(`\n### Suggested Prompt`);
  console.log(handoff.suggestedPrompt);

  return {
    success: true,
    message: `Handoff imported: ${handoff.tasks.filter(t => t.status === 'done').length}/${handoff.tasks.length} tasks done`
  };
}

function generateSuggestedPrompt(
  feature: string,
  tasks: { name: string; done: boolean }[],
  decisions: Decision[]
): string {
  const completed = tasks.filter(t => t.done);
  const pending = tasks.filter(t => !t.done);

  return `Continuing work on ${feature}. Here's the full context:

COMPLETED (${completed.length}/${tasks.length} tasks):
${completed.map(t => `- ${t.name}`).join('\n') || 'None'}

DECISIONS MADE:
${decisions.map(d => `- ${d.id}: ${d.title}`).join('\n') || 'None'}

PENDING:
${pending.map(t => `- ${t.name}`).join('\n') || 'Nothing pending'}

Please continue.`;
}

function getArg(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return null;
  return args[index + 1];
}
