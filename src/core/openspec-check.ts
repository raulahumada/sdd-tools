import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { loadConfig } from './config.js';

const OPENSPEC_REPO = 'https://github.com/Fission-AI/OpenSpec';

/**
 * Comprueba si en la raíz del proyecto existe el layout habitual de OpenSpec.
 */
export function isOpenSpecWorkspace(projectRoot: string): boolean {
  const root = join(projectRoot, 'openspec');
  if (!existsSync(root)) return false;
  const changes = join(root, 'changes');
  const specs = join(root, 'specs');
  return existsSync(changes) || existsSync(specs);
}

function printInstallBlock(severity: 'warn' | 'dim'): void {
  const title =
    severity === 'warn'
      ? chalk.yellow.bold('  OpenSpec no detectado en este proyecto')
      : chalk.dim('  OpenSpec no detectado');
  const lines = [
    '',
    title,
    chalk.dim(
      '  impact, testgap y review están pensados para convivir con OpenSpec (carpetas openspec/changes y openspec/specs).'
    ),
    chalk.dim('  Instala el CLI de OpenSpec e inicializa el repositorio:'),
    chalk.cyan('    npm install -g @fission-ai/openspec@latest'),
    chalk.cyan('    openspec init'),
    chalk.dim(`  Documentación: ${OPENSPEC_REPO}`),
    '',
  ];
  console.log(lines.join('\n'));
}

/**
 * Si en sdd.config.yaml indicas formato OpenSpec o rutas bajo openspec/ y no hay layout, avisa por consola.
 */
export function warnOpenSpecIfExpected(projectRoot: string): void {
  try {
    const config = loadConfig(projectRoot);
    const norm = (config.specs_dir || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const expectsOpenSpec =
      config.spec_format === 'openspec' ||
      norm === 'openspec' ||
      norm.startsWith('openspec/');
    if (!expectsOpenSpec) return;
    if (isOpenSpecWorkspace(projectRoot)) return;
    printInstallBlock('warn');
  } catch {
    /* sin sdd.config.yaml */
  }
}

export interface OpenSpecInitContext {
  specsDir: string;
  specFormat: string;
}

/**
 * Tras `init`: confirma layout OpenSpec o indica cómo instalarlo.
 * Aviso fuerte solo si el usuario eligió formato OpenSpec o rutas bajo openspec/.
 */
export function reportOpenSpecLayoutAfterInit(
  projectRoot: string,
  ctx: OpenSpecInitContext
): void {
  if (isOpenSpecWorkspace(projectRoot)) {
    console.log(
      chalk.green('  ✓') +
        chalk.dim(' Layout OpenSpec detectado (openspec/changes o openspec/specs).')
    );
    return;
  }

  const norm = ctx.specsDir.replace(/\\/g, '/').replace(/\/+$/, '');
  const expectsOpenSpec =
    ctx.specFormat === 'openspec' ||
    norm === 'openspec' ||
    norm.startsWith('openspec/');

  if (expectsOpenSpec) {
    printInstallBlock('warn');
    return;
  }

  console.log(
    chalk.dim(
      '  Tip: impact / testgap / review rinden mejor con OpenSpec. Instala con: npm install -g @fission-ai/openspec@latest && openspec init'
    )
  );
}
