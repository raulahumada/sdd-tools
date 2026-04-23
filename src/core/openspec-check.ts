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

/** True si la config de init asume carpetas OpenSpec (aunque el formato sea markdown). */
export function openSpecExpectedFromInit(ctx: OpenSpecInitContext): boolean {
  const norm = ctx.specsDir.replace(/\\/g, '/').replace(/\/+$/, '');
  return (
    ctx.specFormat === 'openspec' ||
    norm === 'openspec' ||
    norm.startsWith('openspec/')
  );
}

export interface OpenSpecInitContext {
  specsDir: string;
  specFormat: string;
}

function printInstallBlock(): void {
  const lines = [
    '',
    chalk.yellow.bold('  OpenSpec no detectado en esta carpeta'),
    chalk.dim(
      '  Elegiste rutas bajo openspec/; impact, testgap y review necesitan el layout creado por OpenSpec.'
    ),
    chalk.dim('  Instala el CLI e inicializa el repo aquí (raíz del proyecto):'),
    chalk.cyan('    npm install -g @fission-ai/openspec@latest'),
    chalk.cyan('    openspec init'),
    chalk.dim(`  Documentación: ${OPENSPEC_REPO}`),
    '',
  ];
  console.log(lines.join('\n'));
}

/**
 * Durante `init`: aviso **antes** del scaffold (visible) y recordatorio **después** si sigue faltando.
 */
export function reportOpenSpecDuringInit(
  projectRoot: string,
  ctx: OpenSpecInitContext,
  phase: 'before' | 'after'
): void {
  const ok = isOpenSpecWorkspace(projectRoot);
  const expects = openSpecExpectedFromInit(ctx);

  if (phase === 'before') {
    if (ok) return;
    if (expects) {
      printInstallBlock();
      console.log(
        chalk.yellow.bold(
          '  » Puedes pulsar Ctrl+C, ejecutar openspec init, y volver a correr sdd-tools init.'
        )
      );
      console.log(
        chalk.dim('  (Si continúas, se crearán plantillas Cursor; los skills fallarán hasta que exista openspec/.)')
      );
      console.log('');
    } else {
      console.log(
        chalk.dim(
          '  Tip: impact / testgap / review rinden mejor con OpenSpec: npm install -g @fission-ai/openspec@latest && openspec init'
        )
      );
      console.log('');
    }
    return;
  }

  // after
  if (ok) {
    console.log(
      chalk.green('  ✓') + chalk.dim(' Layout OpenSpec detectado (openspec/changes o openspec/specs).')
    );
    return;
  }
  if (expects) {
    console.log(
      chalk.yellow.bold('  » Aún no hay carpeta openspec/ con changes o specs. Instálala antes de usar impact/testgap:')
    );
    console.log(chalk.cyan('    npm install -g @fission-ai/openspec@latest && openspec init'));
    console.log('');
  }
}

/**
 * Si en sdd.config.yaml indicas formato OpenSpec o rutas bajo openspec/ y no hay layout, avisa por consola.
 */
export function warnOpenSpecIfExpected(projectRoot: string): void {
  try {
    const config = loadConfig(projectRoot);
    const ctx: OpenSpecInitContext = {
      specsDir: config.specs_dir,
      specFormat: config.spec_format,
    };
    if (!openSpecExpectedFromInit(ctx)) return;
    if (isOpenSpecWorkspace(projectRoot)) return;
    printInstallBlock();
  } catch {
    /* sin sdd.config.yaml */
  }
}
