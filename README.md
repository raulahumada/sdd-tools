<p align="center">
  <strong style="font-size: 1.75em;">sdd-tools</strong>
</p>

<p align="center">
  CLI y plantillas para <strong>Spec-Driven Development</strong> con asistentes de código (Cursor, VS Code, Claude Code…).
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img alt="Version" src="https://img.shields.io/badge/version-0.5.1-informational?style=flat-square" />
  <!-- Sustituye cuando tengas CI publicado:
  <a href="https://github.com/TU_ORG/sdd-tools/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/TU_ORG/sdd-tools/actions/workflows/ci.yml/badge.svg" /></a>
  -->
</p>

<details>
<summary><strong>Resumen en una frase</strong></summary>

Analiza **carpetas de specs / cambios OpenSpec**, escribe informes en **`sdd-tools/`** y genera **comandos slash**, **skills** y **reglas** para tu IDE — sin sustituir a OpenSpec ni a tu propio flujo de propuestas.

</details>

<p></p>

## Filosofía

```text
→ ligero, no un framework monolítico
→ CLI primero: integrable en CI y en flujos con IA
→ informes legibles por humanos y por el modelo
→ compatible con brownfield: specs sueltos u openspec/changes/
→ Windows y paths relativos tratados de forma explícita
```

> [!TIP]
> **¿Usas OpenSpec u otro layout de cambios?** Pasa el **directorio del cambio** (p. ej. `openspec/changes/mi-feature/`) a `impact analyze` y `testgap analyze`. Los informes resumen `proposal.md`, `design.md`, `tasks.md` y los `**/spec.md` sin volcar todo el Markdown.

> [!NOTE]
> sdd-tools **no** define el formato de tus specs: se apoya en lo que ya exista (`specs/`, `openspec/changes/`, `openspec/specs/`). Para el flujo *propose → apply → archive* mira [OpenSpec](https://github.com/Fission-AI/OpenSpec); sdd-tools encaja como **capa de análisis y calidad** encima.

## Cómo se ve en la práctica

```text
You: npx sdd-tools init
CLI:  sdd.config.yaml, .cursor/commands, .cursor/skills, reglas SDD
      ✓ impact, testgap, review, debt, context, decisions, handoff

You: npx sdd-tools impact analyze openspec/changes/add-readiness-probe-endpoint/
CLI:  ✓ sdd-tools/add-readiness-probe-endpoint/impact.md
      Riesgo, módulos afectados, requisitos SHALL/MUST resumidos, orden sugerido

You: npx sdd-tools testgap analyze openspec/changes/add-readiness-probe-endpoint/
CLI:  ✓ sdd-tools/.../testgap.md — cobertura semántica vs proposal + specs/

You: npx sdd-tools review check openspec/changes/add-readiness-probe-endpoint/
CLI:  ✓ sdd-tools/.../review.md — heurísticas sobre src/ (logs, TODO, any, …)
```

En Cursor, tras `init`, puedes usar comandos tipo **`/sdd-impact`** con la misma ruta de cambio.

## Quick Start

**Requiere Node.js 18 o superior** (proyecto **ESM**).

### Desde el repositorio (desarrollo / local)

```bash
git clone <url-de-este-repositorio>
cd <carpeta-del-clon>   # el nombre del directorio depende del repo (p. ej. sdd-kit)
npm install
npm run build
```

En **tu aplicación** (ajusta la ruta al clon):

```bash
cd ../mi-proyecto
node ../<carpeta-del-clon>/dist/cli.js init
node ../<carpeta-del-clon>/dist/cli.js impact analyze openspec/changes/mi-cambio/
```

Opcional: `npm link` dentro del clon y luego `npx sdd-tools …` en otros repos.

### Cuando publiques en npm

```bash
npm install -g sdd-tools
cd tu-proyecto && sdd-tools init
```

*(Sustituye el nombre del paquete si publicas con scope, p. ej. `@tu-org/sdd-tools`.)*

## Documentación (en este repo)

→ **[Filosofía y flujo](#filosofía)** — principios y encaje con OpenSpec  
→ **[Quick Start](#quick-start)** — instalación y primer `init`  
→ **[Ver en la práctica](#cómo-se-ve-en-la-práctica)** — flujo tipo sesión con IA  
→ **[Rutas de specs](#rutas-de-specs)** — qué acepta el CLI  
→ **[Comandos](#comandos-del-cli)** — referencia rápida  
→ **[Desarrollo del kit](#desarrollo-de-sdd-tools)** — `build`, `dev`, estructura `src/`  
→ **[Convenciones](#convenciones)** — `sdd-tools/`, Windows, git opcional  
→ **[Contribuir](#contribuir)** — PRs e issues  

*(Si más adelante añades `docs/`, enlaza aquí `docs/getting-started.md`, etc.)*

## Por qué sdd-tools

Los asistentes de código son potentes, pero **sin señales estructuradas** el contexto se diluye: no queda claro qué código tocar, qué riesgo hay ni si los tests cubren los SHALL del spec.

- **Antes de implementar** — `impact`: síntesis del cambio + dependencias en `src/`.
- **Después de tests** — `testgap`: requisitos en `proposal.md` y `**/spec.md` vs tests encontrados.
- **Calidad rápida** — `review`: heurísticas sobre validación, async, `console.log`, TODO, `any`.
- **Continuidad** — `context`, `handoff`, `decisions` (ADR) bajo `sdd-tools/<feature>/`.

### Cómo nos comparamos (sin malmeter)

| Enfoque | Rol |
|--------|-----|
| **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** | Flujo y artefactos del cambio (`proposal`, `specs`, `tasks`, slash `/opsx:*`). |
| **sdd-tools** | CLI pequeño: **informes** (`impact`, `testgap`, `review`, `debt`) + **plantillas Cursor** (`init`, `add`). Complementario. |
| **Solo chat** | Sin specs ni informes: más impredecible al crecer el repo. |

## Actualizar sdd-tools en un proyecto

Tras hacer `git pull` en el clon de sdd-tools:

```bash
cd sdd-tools && npm install && npm run build
```

Si regeneraste plantillas del IDE y quieres sobrescribir lo generado por una versión antigua:

```bash
cd tu-proyecto
node ../sdd-tools/dist/cli.js init --force   # revisa antes: puede pisar .cursor/
```

## Comandos del CLI

### Gestión

| Comando | Descripción |
|---------|-------------|
| `sdd-tools init` | Configura el proyecto. Flags: `--ide`, `--specs`, `--format`, `--all`, `--force`. |
| `sdd-tools add <skill>` | Añade skill: `impact`, `context`, `decisions`, `review`, `testgap`, `debt`, `handoff`. |
| `sdd-tools remove <skill>` | Quita un skill. |
| `sdd-tools status` | Estado de `sdd.config.yaml` y ficheros SDD. |

### Skills (ejemplos)

```bash
sdd-tools impact analyze openspec/changes/mi-cambio/
sdd-tools impact full-scan

sdd-tools testgap analyze openspec/changes/mi-cambio/

sdd-tools review check
sdd-tools review check openspec/changes/mi-cambio/

sdd-tools debt scan
sdd-tools debt trend

sdd-tools context save --feature mi-feature --label "sesión"
sdd-tools context load --feature mi-feature

sdd-tools decisions add --feature mi-feature --title "..." --context "..." --decision "..." --consequences "..."

sdd-tools handoff export --feature mi-feature
sdd-tools handoff import --feature mi-feature
```

## Rutas de specs

| Convención | Ejemplo |
|------------|---------|
| Specs planos | `specs/mi-feature/` |
| Cambio OpenSpec | `openspec/changes/add-mi-feature/` (**directorio** del cambio) |
| Catálogo OpenSpec | `openspec/specs/...` si existe |

Las rutas se resuelven **relativas al proyecto** (con `/`), evitando errores típicos de `path.join` en Windows con rutas absolutas.

## Convenciones

1. Pasa el **directorio** del cambio, no solo `proposal.md`.
2. **`sdd-tools/`** — informes para humano/IA; añádelo a `.gitignore` si no quieres versionarlos.
3. **Git** — opcional; context/handoff degradan con gracia si no hay repo.
4. **Modelos** — impact/testgap/review son heurísticos; conviene modelos con buen razonamiento para interpretar los `.md` generados.

## Desarrollo de sdd-tools

```bash
npm install
npm run build    # tsc → dist/
npm run dev      # tsx src/cli.ts
npm test
npm run lint
```

| Ruta | Contenido |
|------|-----------|
| `src/cli.ts` | Commander: comandos y skills. |
| `src/commands/` | `init`, `add`, `remove`, `status`. |
| `src/skills/` | `impact`, `review`, `testgap`, … |
| `src/core/` | `SpecParser`, `ASTUtils`, `Store`, `GitUtils`. |
| `src/templates/cursor/` | Plantillas de comandos, skills y reglas. |

## Contribuir

**Cambios pequeños** — typos, bugs claros, mejoras localizadas: PR directo.

**Cambios grandes** — nuevo skill, cambios de formato de informe o de `init`: abre un **issue** primero para alinear intención (IDEs soportados, compatibilidad con OpenSpec, etc.).

Los PRs con código generado por IA son bienvenidos si vienen **probados** (`npm run build`, flujo manual del CLI). Indica agente y modelo en la descripción del PR.

## Otros

<details>
<summary><strong>Telemetría</strong></summary>

sdd-tools **no** envía telemetría: todo es local al repositorio donde ejecutes el CLI.

</details>

<details>
<summary><strong>Marca y nombre</strong></summary>

“sdd-tools” no está afiliado a OpenSpec ni a Fission AI; solo se documenta la **compatibilidad** de rutas con proyectos que ya usen OpenSpec.

</details>

## Licencia

[MIT](./LICENSE)
