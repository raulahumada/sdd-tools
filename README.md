<p align="center">
  <strong style="font-size: 1.75em;">sdd-tools</strong>
</p>

<p align="center">
  <strong>Spec-Driven Development</strong> para tu repo: specs y cambios OpenSpec entran, <strong>informes claros</strong> y <strong>plantillas Cursor</strong> salen — sin sustituir a OpenSpec ni a tu flujo de propuestas.
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img alt="Version" src="https://img.shields.io/badge/version-0.5.2-informational?style=flat-square" />
  <!-- Descomenta cuando tengas `.github/workflows/ci.yml` en el repo:
  <a href="https://github.com/raulahumada/sdd-tools/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/raulahumada/sdd-tools/actions/workflows/ci.yml/badge.svg" /></a>
  -->
</p>

Las organizaciones que más escalan el software **documentan antes (o junto) al código**: RFCs, diseños, propuestas de cambio. **sdd-tools** lleva esa disciplina al día a día con **IA en el IDE**: lee tus carpetas de spec, resume riesgo y brechas, y deja **skills y comandos** listos para Cursor.

```
Describe el cambio en specs  →  sdd-tools analiza y escribe informes  →  tú (o la IA) implementáis con contexto
```

**No es un generador de código.** Es una **herramienta de claridad**: el spec sigue siendo la fuente de verdad; sdd-tools añade **capa de análisis, continuidad y calidad** encima de lo que ya tengas (`openspec/changes`, `openspec/specs`, markdown).

---

## Requisitos

- **Node.js ≥ 18** (el proyecto publicado en npm es **ESM**).
- **Cursor** — hoy `sdd-tools init` solo genera `.cursor/commands`, `.cursor/skills` y reglas para Cursor; otros IDEs están previstos.
- Opcional: layout **OpenSpec** (`openspec/changes/…`, `openspec/specs/…`) o specs en markdown donde ya los tengas.

No necesitas cuenta ni API propia de sdd-tools: **todo es local** al repositorio donde ejecutes el CLI.

---

## Instalación

```bash
npm install -g sdd-tools
```

O sin instalar global:

```bash
npx sdd-tools --help
```

Repositorio: [github.com/raulahumada/sdd-tools](https://github.com/raulahumada/sdd-tools)

---

## Inicio rápido

### Proyecto que ya tiene código (y specs o cambios OpenSpec)

```bash
cd tu-proyecto

# 1. Estructura SDD + Cursor (elige openspec/changes, openspec/specs o ruta custom)
sdd-tools init

# 2. Impacto del cambio antes de tocar código
sdd-tools impact analyze openspec/changes/mi-cambio/

# 3. Cobertura de tests vs requisitos del spec
sdd-tools testgap analyze openspec/changes/mi-cambio/

# 4. Pasada rápida de calidad sobre el árbol fuente
sdd-tools review check openspec/changes/mi-cambio/
```

Los informes aparecen bajo **`sdd-tools/`** (por defecto). Puedes versionarlos o ignorarlos en `.gitignore`; `init` puede sugerir la entrada.

### Proyecto nuevo

```bash
cd tu-proyecto
sdd-tools init
# Añade specs en openspec/changes/<cambio>/ o la ruta que configuraste
# Luego: impact → testgap → review como arriba
```

En Cursor, tras `init`, puedes usar comandos tipo **`/sdd-impact`** pasando la misma ruta de carpeta del cambio.

---

## Cómo se mantiene “viva” la documentación de apoyo

sdd-tools **no** reescribe tus `proposal.md` ni tus specs de OpenSpec. Lo que sí hace es **regenerar informes** cada vez que ejecutas un skill:

| Acción | Qué se actualiza |
|--------|-------------------|
| `impact analyze <carpeta>` | `sdd-tools/<feature>/impact.md` — riesgo, módulos tocados, requisitos resumidos |
| `testgap analyze <carpeta>` | `sdd-tools/.../testgap.md` — huecos entre SHALL/MUST y tests |
| `review check [carpeta]` | `sdd-tools/.../review.md` — heurísticas (async, logs, TODO, `any`, …) |
| `debt scan` / `debt trend` | `sdd-tools/debt/` — deuda técnica agregada |
| `context` / `handoff` / `decisions` | Artefactos bajo `sdd-tools/<feature>/` según skill |

Flujo mental:

```
Cambio en specs o en código  →  vuelves a ejecutar el skill  →  informes al día para humano e IA
```

---

## Cómo encaja en tu árbol de proyecto

Tras `init` (Cursor):

```
tu-proyecto/
├── sdd.config.yaml              # specs_dir, spec_format, tools habilitados
├── .cursor/
│   ├── commands/                # sdd-impact, sdd-testgap, … (.mdc)
│   ├── skills/sdd-*/          # SKILL.md por herramienta
│   └── rules/                 # p. ej. sdd-skills.mdc
└── sdd-tools/                   # salida de informes (no sustituye a openspec/)
    ├── <feature>/impact.md
    ├── <feature>/testgap.md
    ├── …
    └── debt/
```

Todo queda en **Markdown** y archivos de config en el repo. **Sin lock-in** de runtime: es CLI + plantillas.

---

## Filosofía (en viñetas)

```text
→ Ligero: no es un framework monolítico
→ CLI primero: integrable en CI y en flujos con IA
→ Informes legibles por humanos y por el modelo
→ Brownfield: encaja con openspec/changes y specs sueltos
→ Windows: rutas relativas y normalización explícita
```

> [!TIP]
> Pasa siempre el **directorio** del cambio (p. ej. `openspec/changes/mi-feature/`), no solo un archivo suelto, para que impact/testgap/review vean `proposal.md`, `design.md`, `tasks.md` y `**/spec.md` en contexto.

> [!NOTE]
> Para el flujo *propose → apply → archive* de OpenSpec, mira la documentación de **[OpenSpec](https://github.com/Fission-AI/OpenSpec)**. **sdd-tools** es complementario: análisis, calidad y plantillas Cursor.

---

## Por qué existe (y comparación honesta)

| Enfoque | Rol |
|--------|-----|
| **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** | Flujo y artefactos del cambio (`proposal`, specs, tasks, slash `/opsx:*`). |
| **sdd-tools** | CLI: **informes** (`impact`, `testgap`, `review`, `debt`) + **continuidad** (`context`, `handoff`, `decisions`) + **init/add** para Cursor. |
| **Solo chat** | Menos señal estructurada al crecer el repo. |

---

## Comandos del CLI

### Gestión

| Comando | Descripción |
|---------|-------------|
| `sdd-tools init` | Crea `sdd.config.yaml`, carpetas y plantillas Cursor. Flags: `--ide` (solo `cursor`), `--specs`, `--format` (`markdown` \| `openspec`), `--all`, `--force`. |
| `sdd-tools add <skill>` | Añade skill: `impact`, `context`, `decisions`, `review`, `testgap`, `debt`, `handoff`. |
| `sdd-tools remove <skill>` | Quita un skill. |
| `sdd-tools status` | Muestra estado de `sdd.config.yaml` y artefactos SDD. |

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

---

## Rutas de specs

| Convención | Ejemplo |
|------------|---------|
| Cambio OpenSpec | `openspec/changes/<nombre-del-cambio>/` (**directorio** del cambio) |
| Catálogo OpenSpec | `openspec/specs/…` |
| Markdown / otras | Ruta **custom** configurada en `init` |

Las rutas se resuelven **relativas al proyecto** (normalizando separadores en Windows).

---

## Desarrollo del proyecto

```bash
git clone https://github.com/raulahumada/sdd-tools.git
cd sdd-tools
npm install
npm run build    # tsc → dist/
npm run dev      # tsx src/cli.ts
npm test
npm run lint
```

Probar el CLI en otro repo:

```bash
npm link
cd ../otro-repo && sdd-tools --help
```

| Ruta | Contenido |
|------|------------|
| `src/cli.ts` | Commander: comandos y skills. |
| `src/commands/` | `init`, `add`, `remove`, `status`. |
| `src/skills/` | `impact`, `review`, `testgap`, … |
| `src/core/` | `SpecParser`, `ASTUtils`, `Store`, `GitUtils`. |
| `src/templates/cursor/` | Plantillas de comandos, skills y reglas. |
| `bin/sdd-tools.js` | Entrada npm global (carga `dist/cli.js`). |

### Actualizar un proyecto ya inicializado

Tras actualizar el paquete (`npm update -g sdd-tools` o nuevo build local), puedes regenerar plantillas con **`init --force`** (revisa antes: puede sobrescribir `.cursor/`).

---

## Contribuir

**Cambios pequeños** — typos, bugs claros, mejoras localizadas: PR bienvenido.

**Cambios grandes** — nuevo skill, formato de informe o comportamiento de `init`: abre un **issue** para alinear (IDEs, OpenSpec, etc.).

Los PRs con código asistido por IA son bienvenidos si vienen **probados** (`npm run build`, prueba manual del CLI). Indica agente y modelo en la descripción del PR.

---

## Otros

<details>
<summary><strong>Telemetría</strong></summary>

sdd-tools **no** envía telemetría: todo es local al repositorio donde ejecutes el CLI.

</details>

<details>
<summary><strong>Marca y terceros</strong></summary>

**sdd-tools** no está afiliado a OpenSpec ni a Fission AI; solo se documenta **compatibilidad de rutas** con proyectos que ya usen OpenSpec.

</details>

---

## Licencia

[MIT](./LICENSE)
