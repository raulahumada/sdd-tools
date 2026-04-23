import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { SDDConfig } from './types.js';

export function loadConfig(projectRoot: string): SDDConfig {
  const configPath = join(projectRoot, 'sdd.config.yaml');
  if (!existsSync(configPath)) {
    throw new Error('sdd.config.yaml not found. Run "npx sdd-tools init" first.');
  }
  const content = readFileSync(configPath, 'utf-8');
  return parse(content).sdd as SDDConfig;
}

export function isToolEnabled(config: SDDConfig, toolName: string): boolean {
  return config.tools[toolName]?.enabled ?? false;
}

export function getProjectRoot(): string {
  return process.cwd();
}
