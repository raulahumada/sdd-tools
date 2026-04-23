#!/usr/bin/env node
import { Command } from 'commander';
import { initProject } from './commands/init.js';
import { addSkill } from './commands/add.js';
import { removeSkill } from './commands/remove.js';
import { showStatus } from './commands/status.js';
import { impactSkill } from './skills/impact.js';
import { contextSkill } from './skills/context.js';
import { decisionsSkill } from './skills/decisions.js';
import { reviewSkill } from './skills/review.js';
import { testgapSkill } from './skills/testgap.js';
import { debtSkill } from './skills/debt.js';
import { handoffSkill } from './skills/handoff.js';

const program = new Command();

program
  .name('sdd-tools')
  .description('Spec-Driven Development toolkit for AI-assisted coding')
  .version('0.5.3');

// ─── Management commands ───

program
  .command('init')
  .description('Setup sdd-tools in your project')
  .option('--ide <ide>', 'IDE (only cursor is supported)')
  .option('--specs <dir>', 'Specs directory (e.g. openspec/changes, openspec/specs)')
  .option('--format <format>', 'Spec format: markdown | openspec')
  .option('--all', 'Enable all tools')
  .option('--force', 'Overwrite existing files')
  .action(async (opts) => {
    await initProject(process.cwd(), opts);
  });

program
  .command('add <skill>')
  .description('Add a skill to the project')
  .action(async (skill: string) => {
    await addSkill(skill, process.cwd());
  });

program
  .command('remove <skill>')
  .description('Remove a skill from the project')
  .action(async (skill: string) => {
    await removeSkill(skill, process.cwd());
  });

program
  .command('status')
  .description('Show current sdd-tools status')
  .action(async () => {
    await showStatus(process.cwd());
  });

// ─── Skills ───

program
  .command('impact <action> [specPath]')
  .description('Analyze what code will break')
  .action(async (action: string, specPath?: string) => {
    const args = specPath ? [action, specPath] : [action];
    const result = await impactSkill(args, process.cwd());
    if (!result.success) {
      console.error(result.message);
      process.exit(1);
    }
  });

program
  .command('context <action> [rest...]')
  .description('Save or restore session context')
  .allowUnknownOption()
  .action(async (action: string, rest?: string[]) => {
    const args = [action, ...(rest || [])];
    const result = await contextSkill(args, process.cwd());
    if (!result.success) {
      console.error(result.message);
      process.exit(1);
    }
  });

program
  .command('decisions <action> [rest...]')
  .description('Capture or search architectural decisions')
  .allowUnknownOption()
  .action(async (action: string, rest?: string[]) => {
    const args = [action, ...(rest || [])];
    const result = await decisionsSkill(args, process.cwd());
    if (!result.success) {
      console.error(result.message);
      process.exit(1);
    }
  });

program
  .command('review <action> [specPath]')
  .description('Pre-review code based on learned patterns')
  .action(async (action: string, specPath?: string) => {
    const args = specPath ? [action, specPath] : [action];
    const result = await reviewSkill(args, process.cwd());
    if (!result.success) {
      console.error(result.message);
      process.exit(1);
    }
  });

program
  .command('testgap <action> [specPath]')
  .description('Check if specs have test coverage')
  .action(async (action: string, specPath?: string) => {
    const args = specPath ? [action, specPath] : [action];
    const result = await testgapSkill(args, process.cwd());
    if (!result.success) {
      console.error(result.message);
      process.exit(1);
    }
  });

program
  .command('debt <action>')
  .description('Track technical debt')
  .action(async (action: string) => {
    const result = await debtSkill([action], process.cwd());
    if (!result.success) {
      console.error(result.message);
      process.exit(1);
    }
  });

program
  .command('handoff <action> [rest...]')
  .description('Export or import context between agents')
  .allowUnknownOption()
  .action(async (action: string, rest?: string[]) => {
    const args = [action, ...(rest || [])];
    const result = await handoffSkill(args, process.cwd());
    if (!result.success) {
      console.error(result.message);
      process.exit(1);
    }
  });

program.parse();