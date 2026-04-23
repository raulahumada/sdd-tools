export const CURSOR_COMMANDS: Record<string, string> = {
    impact: `---
  command: /sdd-impact
  description: Analyze what code will break before implementing a spec
  ---
  
  # Impact Analysis
  
  Analyze the given spec and predict what existing code will be affected.
  
  ## Steps
  
  1. Run the analysis:
     \`\`\`bash
     npx sdd-kit impact analyze {{args}}
     \`\`\`
  
  2. Read the output at \`sdd-tools/<feature>/impact.md\`
  
  3. Present the results:
  
     **Impact Analysis: <feature>**
     Risk: <score>/10 (<level>)
  
     **Affected modules:**
     - <module> — <coupling> coupling, <risk> risk, <N> tests at risk
  
     **Recommended order:**
     1. <first module>
     2. <second module>
     3. ...
  
  4. If risk is HIGH (7+), ask: "Want me to proceed or refactor first?"
  
  5. If risk is LOW (<4), say: "Low risk. Safe to proceed."
  
  ## If no argument provided
  
  Ask: "Which spec should I analyze?"
  List available specs from specs/ directory.
  
  ## After presenting
  
  Ask: "Want me to start implementing?"
  `,
  
    context: `---
  command: /sdd-context
  description: Save or restore coding session context
  ---
  
  # Session Context
  
  Manage your coding session state across work sessions.
  
  ## Subcommands
  
  ### save
  \`\`\`bash
  npx sdd-kit context save --feature <feature> --label "<description>"
  \`\`\`
  Confirm: "Saved. <N>/<total> tasks completed."
  
  ### load
  \`\`\`bash
  npx sdd-kit context load --feature <feature>
  \`\`\`
  Present:
  - What feature was being worked on
  - What tasks are done
  - What tasks are pending
  - What decisions were made
  - What files were last modified
  
  Ask: "Should we continue with <next pending task>?"
  
  ### list
  \`\`\`bash
  npx sdd-kit context list
  \`\`\`
  Show all sessions grouped by feature.
  `,
  
    decisions: `---
  command: /sdd-decisions
  description: Capture, list, or search architectural decisions
  ---
  
  # Decision Capture
  
  Manage Architecture Decision Records (ADRs).
  
  ## Subcommands
  
  ### add
  \`\`\`bash
  npx sdd-kit decisions add --feature <feature> --title "..." --context "..." --decision "..." --consequences "..."
  \`\`\`
  If user just says "add decision" without details, ask:
  - What's the decision?
  - Why was it needed?
  - What did you choose?
  - What are the tradeoffs?
  
  Confirm: "Saved as ADR-<N>: <title>"
  
  ### list
  \`\`\`bash
  npx sdd-kit decisions list [--feature <feature>]
  \`\`\`
  Show as numbered list with title and feature.
  
  ### search
  \`\`\`bash
  npx sdd-kit decisions search "<query>"
  \`\`\`
  Find decisions by keyword.
  `,
  
    review: `---
  command: /sdd-review
  description: Pre-review code based on learned patterns
  ---
  
  # Pre-Review
  
  Automated review based on patterns from past reviews.
  
  ## Steps
  
  1. Run:
     \`\`\`bash
     npx sdd-kit review check {{args}}
     \`\`\`
  
  2. Read: \`sdd-tools/<feature>/review.md\`
  
  3. Parse by severity:
     - 🔴 **Errors:** Must fix. WILL be caught in human review.
     - 🟡 **Warnings:** Should fix. LIKELY caught.
     - ℹ️ **Info:** Note but don't block.
  
  4. If errors found: Fix all, re-run to confirm clean.
  
  5. If clean: "Pre-review: ✅ clean. Ready for PR."
  
  ## After fixing
  
  Always re-run the review to confirm:
  \`\`\`bash
  npx sdd-kit review check {{args}}
  \`\`\`
  Don't assume the fix worked. Verify.
  `,
  
    testgap: `---
  command: /sdd-testgap
  description: Check if all spec requirements have test coverage
  ---
  
  # Test Gap Analysis
  
  Map each requirement from the spec against existing tests.
  This measures REQUIREMENT coverage, not line coverage.
  
  ## Steps
  
  1. Run:
     \`\`\`bash
     npx sdd-kit testgap analyze {{args}}
     \`\`\`
  
  2. Read: \`sdd-tools/<feature>/testgap.md\`
  
  3. Present:
     \`\`\`
     [████████████████░░░░] 80% requirement coverage (8/10)
  
     ✅ Covered: <requirement> → test in <file>
     🔴 Missing: <requirement> → suggested: <test>
     \`\`\`
  
  4. If < 100%: Write missing tests, re-run to confirm.
  
  ## Important
  Line coverage can be 95% while requirement coverage is 50%.
  Requirements are detected from spec.md lines containing MUST, SHALL, SHOULD.
  `,
  
    debt: `---
  command: /sdd-debt
  description: Track and monitor technical debt
  ---
  
  # Technical Debt Tracker
  
  ## Subcommands
  
  ### scan
  \`\`\`bash
  npx sdd-kit debt scan
  \`\`\`
  Read: \`sdd-tools/debt/report.md\`
  Present score, modules, and trend.
  
  ### trend
  \`\`\`bash
  npx sdd-kit debt trend
  \`\`\`
  Show debt history over time.
  
  ## When to run
  - After completing a full feature
  - Before sprint review
  - User asks "how's the codebase?"
  `,
  
    handoff: `---
  command: /sdd-handoff
  description: Export or import full context between AI agents
  ---
  
  # Context Handoff
  
  ## Subcommands
  
  ### export
  \`\`\`bash
  npx sdd-kit handoff export --feature <feature>
  \`\`\`
  Confirm: "Handoff exported. <N>/<total> tasks done."
  
  ### import
  \`\`\`bash
  npx sdd-kit handoff import --feature <feature>
  \`\`\`
  Present full context:
  - Tasks completed and pending
  - Decisions made
  - Issues already resolved
  - Suggested prompt to continue
  
  ## When to use
  - Switching from Cursor to Claude Code
  - Another developer taking over
  - End of day
  `,
  };
  