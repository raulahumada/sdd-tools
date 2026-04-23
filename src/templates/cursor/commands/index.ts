export const CURSOR_COMMANDS: Record<string, string> = {
  impact: `---
name: /sdd-impact
id: sdd-impact
category: Workflow
description: Analyze what code will break before implementing a spec
---

Analyze what existing code will be affected when implementing a spec.

I'll analyze the spec and predict:
- Which modules will be affected
- Risk score (0-10)
- Recommended implementation order
- Breaking change predictions
- Tests at risk

---

**Input**: Ruta del spec o del cambio OpenSpec (p. ej. \`specs/feature-auth/\`, \`openspec/changes/add-feature/\`).

**Steps**

1. **If no input provided, ask which spec to analyze**

   Ask the user:
   > "Which spec should I analyze? I'll check what code will be affected."

   If they don't specify, lista \`specs/\` y \`openspec/changes/\` en la raíz del proyecto (explorador de archivos o \`ls\` / \`dir\`).

2. **Run the impact analysis**
   \`\`\`bash
   npx sdd-tools impact analyze {{args}}
   \`\`\`
   Usa la ruta al **directorio del cambio** (barra final opcional); el informe **resume** esos \`.md\` y añade el análisis de dependencias en código.

3. **Read the output**
   Read the file at \`sdd-tools/<feature>/impact.md\` (nombre de carpeta = último segmento de la ruta del cambio).

4. **Present the results**

   Format:
   \`\`\`
   Impact Analysis: <feature>

   Risk: <score>/10 (<emoji> <level>)

   Resumen de specs/documentación (ya en impact.md), luego módulos afectados:

   Affected modules:
   - <module> — <coupling> coupling, <N> tests at risk

   Recommended implementation order:
   1. <first module>
   2. <second module>

   Breaking changes predicted:
   - <description>
   \`\`\`

5. **Act on risk level**
   - Risk 0-3 (LOW): "Low risk. Safe to proceed in any order."
   - Risk 4-6 (MEDIUM): Follow recommended order. Warn about affected modules.
   - Risk 7-10 (HIGH): Ask "This is high risk. Want me to proceed or refactor first?"

6. **After presenting, ask**
   "Want me to start implementing?"

**Guardrails**
- Always re-run analysis even if impact.md exists (code may have changed)
- If no design.md exists, analyze based on spec.md and tasks.md only
- If greenfield (no source files), note that risk is predicted
- Always read the output file after running the command
`,

  context: `---
name: /sdd-context
id: sdd-context
category: Workflow
description: Save or restore coding session context
---

Save and restore coding session state across work sessions.

I'll capture:
- Tasks completed and pending
- Decisions made
- Files modified
- Git state

---

**Input**: Subcommand (save, load, list) and optional feature name.

**Steps**

### Save

When the user says "save progress", "save where we are":

1. Ask feature name if not obvious
2. Run: \`npx sdd-tools context save --feature <feature> --label "<description>"\`
3. Confirm: "Saved. <N>/<total> tasks completed."

### Load

When the user says "where were we?", "continue":

1. Run: \`npx sdd-tools context load --feature <feature>\`
2. Present:
   \`\`\`
   <feature>: <N>/<total> tasks completed

   Done: <task list>
   Pending: <task list>
   Decisions: <ADR list>

   Should we continue with <next task>?
   \`\`\`

### List

\`\`\`bash
npx sdd-tools context list
\`\`\`

**Guardrails**
- If no sessions exist, say "No previous context found. Starting fresh."
- If git has diverged, warn the user
`,

  decisions: `---
name: /sdd-decisions
id: sdd-decisions
category: Workflow
description: Capture, list, or search architectural decisions
---

Capture and manage Architecture Decision Records (ADRs).

---

**Input**: Subcommand (add, list, search) and parameters.

**Steps**

### Add

\`\`\`bash
npx sdd-tools decisions add --feature <feature> --title "..." --context "..." --decision "..." --consequences "..."
\`\`\`

If user just says "add decision" without details, ask:
- What's the decision?
- Why was it needed?
- What did you choose?
- What are the tradeoffs?

Confirm: "Saved as ADR-<N>: <title>"

### List

\`\`\`bash
npx sdd-tools decisions list --feature <feature>
\`\`\`

### Search

\`\`\`bash
npx sdd-tools decisions search "<query>"
\`\`\`

**What counts as a decision**
- Choosing a library, pattern, architecture, or tradeoff
- Choosing NOT to do something

**What does NOT count**
- Implementing exactly as spec describes
- Trivial choices (variable names)
`,

  review: `---
name: /sdd-review
id: sdd-review
category: Workflow
description: Pre-review code based on learned patterns
---

Automated pre-review based on patterns from past code reviews.

I'll check for:
- Missing input validation
- Missing error handling
- Hardcoded values
- Console.log left behind
- TODO/FIXME
- Missing types (any)

---

**Input**: A spec path to review against.

**Steps**

1. Run: \`npx sdd-tools review check {{args}}\`
2. Read: \`sdd-tools/<feature>/review.md\`
3. Parse by severity:
   - 🔴 Errors: Must fix
   - 🟡 Warnings: Should fix
   - ℹ️ Info: Note but don't block
4. Fix ALL errors before marking task as done
5. Re-run after fixes to confirm clean

**Guardrails**
- Don't skip errors — fix them before continuing
- Always re-run after fixes
`,

  testgap: `---
name: /sdd-testgap
id: sdd-testgap
category: Workflow
description: Check if all spec requirements have test coverage
---

Map each requirement from the spec against existing tests.
This measures REQUIREMENT coverage, not line coverage.

---

**Input**: A spec path to analyze.

**Steps**

1. Run: \`npx sdd-tools testgap analyze {{args}}\`
2. Read: \`sdd-tools/<feature>/testgap.md\`
3. Present:
   \`\`\`
   [████████████████░░░░] 80% requirement coverage (8/10)

   ✅ Covered: <requirement> → test in <file>
   🔴 Missing: <requirement> → suggested: <test>
   \`\`\`
4. If < 100%: Write missing tests, re-run to confirm
5. If 100%: "All requirements have test coverage ✅"

**Requirements** se detectan en líneas con MUST, SHALL o SHOULD en \`proposal.md\` y en cada \`**/spec.md\` bajo el directorio del cambio.

**Guardrails**
- Always re-run after adding tests
- A test must ASSERT the requirement, not just touch the code
`,

  debt: `---
name: /sdd-debt
id: sdd-debt
category: Workflow
description: Track and monitor technical debt
---

Monitor the health of your codebase over time.

---

**Input**: Subcommand (scan, trend).

**Steps**

### Scan

1. Run: \`npx sdd-tools debt scan\`
2. Read: \`sdd-tools/debt/report.md\`
3. Present score, modules, and trend

### Trend

1. Run: \`npx sdd-tools debt trend\`
2. Show debt history over time

**When to run**
- After completing a full feature
- Before sprint review
- User asks "how's the codebase?"
`,

  handoff: `---
name: /sdd-handoff
id: sdd-handoff
category: Workflow
description: Export or import context between AI agents
---

Transfer complete work context between agents, IDEs, or team members.

---

**Input**: Subcommand (export, import) and feature name.

**Steps**

### Export

1. Run: \`npx sdd-tools handoff export --feature <feature>\`
2. Confirm: "Handoff exported. <N>/<total> tasks done."

### Import

1. Run: \`npx sdd-tools handoff import --feature <feature>\`
2. Check git state. Warn if diverged.
3. Present full context:
   \`\`\`
   <feature>: <N>/<total> tasks done

   Completed: <task list>
   Decisions: <ADR list>
   Pending: <pending tasks>

   Ready to continue. Should we pick up with <next task>?
   \`\`\`

**When to use**
- Switching from Cursor to Claude Code
- Another developer taking over
- End of day
`,
};
