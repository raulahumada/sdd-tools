export const CURSOR_SKILLS: Record<string, string> = {
    impact: `---
  name: sdd-impact
  description: Analyze what code will break before implementing a spec. Use when the user wants to implement a feature from specs/ or asks "what will this affect".
  license: MIT
  compatibility: Requires sdd-kit CLI.
  metadata:
    author: sdd-kit
    version: "0.1.0"
  ---
  
  Analyze what existing code will be affected when implementing a spec.
  
  I'll analyze the spec and predict:
  - Which modules will be affected
  - Risk score (0-10)
  - Recommended implementation order
  - Breaking change predictions
  - Tests at risk
  
  ---
  
  **Input**: Ruta al directorio del spec o del cambio OpenSpec (p. ej. \`specs/feature-auth/\`, \`openspec/changes/add-feature/\`).
  
  **Steps**
  
  1. **If no spec path provided, ask which spec to analyze**
  
     Ask the user:
     > "Which spec should I analyze? I'll check what code will be affected."
  
     If they don't specify, list \`specs/\` and \`openspec/changes/\` at project root.
  
  2. **Run the impact analysis**
     \`\`\`bash
     npx sdd-kit impact analyze {{args}}
     \`\`\`
     Use the change/spec **directory** path (trailing slash optional). The report **summarizes** those docs (no full paste) plus dependency analysis.
  
  3. **Read the output**
     Read the file at \`sdd-tools/<feature>/impact.md\`
  
  4. **Present the results**
  
     Format:
     \`\`\`
     Impact Analysis: <feature>
  
     Risk: <score>/10 (<emoji> <level>)
  
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
  name: sdd-context
  description: Save and restore coding session context. Use when the user wants to save progress, resume work, or asks "where were we?".
  license: MIT
  compatibility: Requires sdd-kit CLI.
  metadata:
    author: sdd-kit
    version: "0.1.0"
  ---
  
  Save and restore coding session state across work sessions.
  
  I'll capture:
  - Tasks completed and pending
  - Decisions made
  - Files modified
  - Git state
  
  ---
  
  **Input**: A subcommand (save, load, list) and optional feature name.
  
  **Steps**
  
  ### Save
  
  When the user says "save progress", "save where we are":
  
  1. Ask feature name if not obvious
  2. Run: \`npx sdd-kit context save --feature <feature> --label "<description>"\`
  3. Confirm: "Saved. <N>/<total> tasks completed."
  
  ### Load
  
  When the user says "where were we?", "continue":
  
  1. Run: \`npx sdd-kit context load --feature <feature>\`
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
  npx sdd-kit context list
  \`\`\`
  
  **Guardrails**
  - If no sessions exist, say "No previous context found. Starting fresh."
  - If git has diverged, warn the user
  `,
  
    decisions: `---
  name: sdd-decisions
  description: Capture architectural decisions as ADRs. Use when a significant design choice is made during implementation.
  license: MIT
  compatibility: Requires sdd-kit CLI.
  metadata:
    author: sdd-kit
    version: "0.1.0"
  ---
  
  Capture and manage Architecture Decision Records (ADRs).
  
  ---
  
  **Input**: A subcommand (add, list, search) and parameters.
  
  **Steps**
  
  ### Add
  
  When a non-trivial architectural choice is made:
  
  1. Gather information from context
  2. Run: \`npx sdd-kit decisions add --feature <feature> --title "..." --context "..." --decision "..." --consequences "..."\`
  3. Confirm briefly: "ADR saved: <title>"
  
  ### What counts as a decision
  - Choosing a library, pattern, architecture, or tradeoff
  - Choosing NOT to do something
  
  ### What does NOT count
  - Implementing exactly as spec describes
  - Trivial choices (variable names)
  
  ### List
  \`\`\`bash
  npx sdd-kit decisions list --feature <feature>
  \`\`\`
  
  ### Search
  \`\`\`bash
  npx sdd-kit decisions search "<query>"
  \`\`\`
  
  **Guardrails**
  - Capture decisions proactively during implementation
  - Don't ask permission — just capture and mention briefly
  `,
  
    review: `---
  name: sdd-review
  description: Pre-review code based on learned patterns. Use after completing a task or before opening a PR.
  license: MIT
  compatibility: Requires sdd-kit CLI.
  metadata:
    author: sdd-kit
    version: "0.1.0"
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
  
  1. Run: \`npx sdd-kit review check {{args}}\` (optional path; default output folder \`review\`)
  2. Read: \`sdd-tools/<feature>/review.md\`
  3. Parse by severity:
     - 🔴 Errors: Must fix. WILL be caught in human review.
     - 🟡 Warnings: Should fix. LIKELY caught.
     - ℹ️ Info: Note but don't block.
  4. Fix ALL errors before marking task as done
  5. Re-run after fixes to confirm clean
  
  **Guardrails**
  - Don't skip errors — fix them before continuing
  - Always re-run after fixes
  - The review learns patterns over time
  `,
  
    testgap: `---
  name: sdd-testgap
  description: Check if all spec requirements have test coverage. Use after writing tests or before marking a feature complete.
  license: MIT
  compatibility: Requires sdd-kit CLI.
  metadata:
    author: sdd-kit
    version: "0.1.0"
  ---
  
  Map each requirement from the spec against existing tests.
  This measures REQUIREMENT coverage, not line coverage.
  
  ---
  
  **Input**: A spec path to analyze.
  
  **Steps**
  
  1. Run: \`npx sdd-kit testgap analyze {{args}}\` (e.g. \`openspec/changes/<change>/\`)
  2. Read: \`sdd-tools/<feature>/testgap.md\`
  3. Present:
     \`\`\`
     [████████████████░░░░] 80% requirement coverage (8/10)
  
     ✅ Covered: <requirement> → test in <file>
     🔴 Missing: <requirement> → suggested: <test>
     \`\`\`
  4. If < 100%: Write missing tests, re-run to confirm
  5. If 100%: "All requirements have test coverage ✅"
  
  **Requirements are detected from spec.md lines containing MUST, SHALL, SHOULD.**
  
  **Guardrails**
  - Always re-run after adding tests
  - A test must ASSERT the requirement, not just touch the code
  `,
  
    debt: `---
  name: sdd-debt
  description: Track technical debt over time. Use after completing a feature or when asking about codebase health.
  license: MIT
  compatibility: Requires sdd-kit CLI.
  metadata:
    author: sdd-kit
    version: "0.1.0"
  ---
  
  Monitor the health of your codebase over time.
  
  ---
  
  **Input**: A subcommand (scan, trend).
  
  **Steps**
  
  ### Scan
  
  1. Run: \`npx sdd-kit debt scan\`
  2. Read: \`sdd-tools/debt/report.md\`
  3. Present score, modules, and trend
  
  ### Trend
  
  1. Run: \`npx sdd-kit debt trend\`
  2. Show debt history over time
  
  **When to run**
  - After completing a full feature
  - Before sprint review
  - User asks "how's the codebase?"
  `,
  
    handoff: `---
  name: sdd-handoff
  description: Export or import full context between AI agents or developers. Use when switching agents, IDEs, or handing off to another person.
  license: MIT
  compatibility: Requires sdd-kit CLI.
  metadata:
    author: sdd-kit
    version: "0.1.0"
  ---
  
  Transfer complete work context between agents, IDEs, or team members.
  
  ---
  
  **Input**: A subcommand (export, import) and feature name.
  
  **Steps**
  
  ### Export
  
  When the user says "handoff" or "switch agent":
  
  1. Run: \`npx sdd-kit handoff export --feature <feature>\`
  2. Confirm: "Handoff exported. <N>/<total> tasks done."
  
  ### Import
  
  When the user says "continue from handoff":
  
  1. Run: \`npx sdd-kit handoff import --feature <feature>\`
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
  