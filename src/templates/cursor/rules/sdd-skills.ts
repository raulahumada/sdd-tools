export function CURSOR_RULES(enabledTools: string[]): string {
    const sections: string[] = [];
  
    if (enabledTools.includes('impact')) {
      sections.push(`
  ## Skill: Impact Analysis (BEFORE implementing)
  
  ### When to trigger
  - User asks you to implement a feature from \`specs/\`
  - User says "implement", "build", "start working on" referring to a spec
  
  ### How to execute
  1. Run: \`npx sdd-kit impact analyze <ruta-spec-o-cambio>/\` (ej. \`openspec/changes/<change>/\` o \`specs/<feature>/\`)
  2. Read: \`sdd-tools/<feature-name>/impact.md\`
  3. Present the analysis to the user BEFORE starting implementation
  
  ### How to interpret results
  - **Risk 0-3 (LOW):** Safe to implement in any order. Mention briefly.
  - **Risk 4-6 (MEDIUM):** Follow recommended order. Warn about affected modules.
  - **Risk 7-10 (HIGH):** STRONGLY follow recommended order. Ask user if they want to proceed.
  
  ### How to present
  \`\`\`
  Analyzed impact for <feature>:
  - Risk: <score>/10 (<level>)
  - <N> modules will be affected
  - Implementation order: <list>
  - <N> existing tests may break
  
  I'll start with <first-module> to minimize risk.
  \`\`\`
  
  ### Edge cases
  - If impact.md already exists, re-run anyway (code may have changed)
  - If no design.md, analyze based on spec.md and tasks.md only
  - If greenfield (no source files), note risk is predicted`);
    }
  
    if (enabledTools.includes('review')) {
      sections.push(`
  ## Skill: Pre-Review (AFTER each task)
  
  ### When to trigger
  - You just completed a task from tasks.md
  - User says "review this", "check this", "is this good?"
  
  ### How to execute
  1. Run: \`npx sdd-kit review check [openspec/changes/<change>/|specs/<feature>/]\` (argumento opcional; sin él el informe va a \`sdd-tools/review/review.md\`)
  2. Read: \`sdd-tools/<feature-name>/review.md\`
  3. Fix ALL errors before marking task as done
  4. Fix warnings if quick fixes (< 2 min)
  5. Mention info items but don't block
  
  ### How to present
  If issues found:
  \`\`\`
  Pre-review found <N> issues:
  - 🔴 <error> in <file>:<line> → fixing now
  - 🟡 <warning> in <file>:<line> → fixing now
  
  [after fixing]
  Fixed. Task marked as done.
  \`\`\`
  
  If clean:
  \`\`\`
  Pre-review: ✅ clean. Task marked as done.
  \`\`\``);
    }
  
    if (enabledTools.includes('testgap')) {
      sections.push(`
  ## Skill: Test Gap Analysis (AFTER writing tests)
  
  ### When to trigger
  - You just finished writing a test suite
  - User says "are we covered?", "check test coverage"
  
  ### How to execute
  1. Run: \`npx sdd-kit testgap analyze openspec/changes/<change>/\` o \`specs/<feature>/\`
  2. Read: \`sdd-tools/<feature-name>/testgap.md\`
  3. If coverage < 100%, write the missing tests
  4. Re-run to confirm 100%
  
  ### How to present
  \`\`\`
  Test gap analysis:
  - Coverage: <X>% (<N>/<total> requirements)
  
  ✅ Covered:
  - <requirement> → test in <file>
  
  🔴 Missing:
  - <requirement> → suggested: <test suggestion>
  
  Adding missing tests...
  Coverage: 100% ✅
  \`\`\``);
    }
  
    if (enabledTools.includes('decisions')) {
      sections.push(`
  ## Skill: Decision Capture (WHEN making architectural choices)
  
  ### When to trigger
  - You chose one pattern over another
  - You added a new dependency
  - You made a significant refactor
  
  ### How to execute
  1. Run: \`npx sdd-kit decisions add --feature <feature> --title "..." --context "..." --decision "..." --consequences "..."\`
  2. Brief mention, don't interrupt flow
  
  ### What counts as a decision
  - Choosing a library (e.g., "Zod over Joi")
  - Choosing a pattern (e.g., "Repository pattern")
  - Choosing an architecture (e.g., "Stateless JWT")
  - Choosing a tradeoff (e.g., "15min expiry for security")
  
  ### What does NOT count
  - Implementing exactly as spec describes
  - Following existing patterns
  - Trivial choices (variable names)`);
    }
  
    if (enabledTools.includes('context')) {
      sections.push(`
  ## Skill: Session Context (WHEN starting/ending)
  
  ### When to trigger — SAVE
  - User says "save where we are", "save progress"
  - Before switching to a different feature
  
  ### When to trigger — LOAD
  - User opens project and there are pending tasks
  - User says "where were we?", "continue"
  
  ### How to execute
  - SAVE: \`npx sdd-kit context save --feature <feature> --label "<description>"\`
  - LOAD: \`npx sdd-kit context load --feature <feature>\`
  
  ### How to present after LOAD
  \`\`\`
  Welcome back. Here's where we left off:
  
  📊 <feature>: <N>/<total> tasks completed
  
  ✅ Done:
  - <task 1>
  - <task 2>
  
  ⬜ Pending:
  - <task 3>
  
  📝 Decisions made:
  - <ADR-001>: <title>
  
  Should we continue with <next pending task>?
  \`\`\``);
    }
  
    if (enabledTools.includes('debt')) {
      sections.push(`
  ## Skill: Debt Tracking (AFTER completing a feature)
  
  ### When to trigger
  - All tasks in tasks.md are done
  - User says "how's the codebase?", "check code quality"
  
  ### How to execute
  1. Run: \`npx sdd-kit debt scan\`
  2. Read: \`sdd-tools/debt/report.md\`
  3. Report the trend
  
  ### How to present
  \`\`\`
  📊 Codebase health:
  - Overall score: <X>/10 (<trend>)
  
  <feature> impact: <+/- change>
  
  <if debt increased>
  ⚠️ This feature added some debt. Consider refactoring <module>.
  \`\`\``);
    }
  
    if (enabledTools.includes('handoff')) {
      sections.push(`
  ## Skill: Handoff (WHEN switching agents)
  
  ### When to trigger
  - User says "handoff", "switch to <agent>", "export context"
  
  ### How to execute
  - EXPORT: \`npx sdd-kit handoff export --feature <feature>\`
  - IMPORT: \`npx sdd-kit handoff import --feature <feature>\`
  
  ### How to present after IMPORT
  \`\`\`
  Importing context from <previous-agent>...
  
  📊 <feature>: <N>/<total> tasks done
  
  ✅ Completed: <task list>
  📝 Decisions: <ADR list>
  🔧 Resolved issues: <issue list>
  ⬜ Pending: <pending tasks>
  
  Ready to continue. Should we pick up with <next task>?
  \`\`\``);
    }
  
    return `---
  description: SDD auto-skills — run automatically during spec-driven development
  globs: ["specs/**/*.md", "openspec/**/*.md", "src/**/*.{ts,tsx,js,jsx}"]
  ---
  
  # SDD Skills — Spec-Driven Development Toolkit
  
  You have access to SDD skills that enhance the development workflow.
  These run automatically at specific moments. Follow the instructions precisely.
  ${sections.join('\n---\n')}
  
  ---
  
  ## General rules
  
  1. **Always read the output file** after running a skill. Don't assume success.
  2. **Present results concisely.** Don't dump raw markdown to the user.
  3. **Fix issues before continuing.** If review finds errors, fix them before marking tasks done.
  4. **Don't skip skills.** They exist to catch problems early.
  5. **Skills are automatic.** Don't ask permission to run them. Just run them and present results.
  6. **If a skill fails**, report the error and continue without it. Don't block the user.
  `;
  }
  