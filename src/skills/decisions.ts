import { Store } from '../core/store.js';
import { SkillResult } from '../core/types.js';

export async function decisionsSkill(
  args: string[],
  projectRoot: string = process.cwd()
): Promise<SkillResult> {
  const [action, ...rest] = args;

  if (action === 'add') return add(rest, projectRoot);
  if (action === 'list') return list(rest, projectRoot);
  if (action === 'search') return search(rest, projectRoot);

  return { success: false, message: 'Usage: sdd-kit decisions add|list|search' };
}

async function add(args: string[], projectRoot: string): Promise<SkillResult> {
  const store = new Store(projectRoot);

  const feature = getArg(args, '--feature') || 'default';
  const title = getArg(args, '--title') || 'Untitled Decision';
  const context = getArg(args, '--context') || '';
  const decision = getArg(args, '--decision') || '';
  const consequences = getArg(args, '--consequences') || '';

  const existing = store.listFiles(feature, 'decisions').filter(f => f.startsWith('ADR'));
  const nextNum = existing.length + 1;
  const id = `ADR-${String(nextNum).padStart(3, '0')}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40);
  const filename = `${id}-${slug}.md`;

  const content = `# ${id}: ${title}

**Status**: Accepted
**Date**: ${new Date().toISOString().split('T')[0]}
**Feature**: ${feature}

## Context
${context}

## Decision
${decision}

## Consequences
${consequences}
`;

  const outputPath = store.writeSubDir(feature, 'decisions', filename, content);
  console.log(`✓ Decision saved: ${outputPath}`);

  return { success: true, message: `${id}: ${title}`, outputPath };
}

async function list(args: string[], projectRoot: string): Promise<SkillResult> {
  const store = new Store(projectRoot);
  const feature = getArg(args, '--feature') || 'default';

  const files = store.listFiles(feature, 'decisions').filter(f => f.startsWith('ADR'));

  if (files.length === 0) {
    console.log(`No decisions found for ${feature}.`);
    return { success: true, message: 'No decisions found' };
  }

  console.log(`Decisions for ${feature}:`);
  for (const f of files) {
    const content = store.readSubDir(feature, 'decisions', f);
    if (content) {
      const titleMatch = content.match(/^# .+$/m);
      console.log(`  ${titleMatch?.[0] || f}`);
    }
  }

  return { success: true, message: `Found ${files.length} decisions` };
}

async function search(args: string[], projectRoot: string): Promise<SkillResult> {
  const store = new Store(projectRoot);
  const query = args.join(' ').toLowerCase();

  const globalIndex = store.read('global', 'all-decisions.md');
  if (!globalIndex) {
    console.log('No decisions found.');
    return { success: true, message: 'No decisions found' };
  }

  console.log(`Searching for "${query}"...`);
  // Simple search through global index
  const lines = globalIndex.split('\n').filter(l => l.toLowerCase().includes(query));
  lines.forEach(l => console.log(`  ${l}`));

  return { success: true, message: `Found ${lines.length} matches` };
}

function getArg(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return null;
  return args[index + 1];
}
