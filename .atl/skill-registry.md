# Skill Registry — uigen

Generated: 2026-04-02

## User Skills (`~/.claude/skills/`)

| Skill | Trigger |
|-------|---------|
| `branch-pr` | When creating a pull request, opening a PR, or preparing changes for review |
| `issue-creation` | When creating a GitHub issue, reporting a bug, or requesting a feature |
| `judgment-day` | When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" |
| `go-testing` | When writing Go tests, using teatest, or adding test coverage |
| `skill-creator` | When user asks to create a new skill, add agent instructions, or document patterns for AI |
| `sdd-explore` | When orchestrator delegates codebase exploration |
| `sdd-propose` | When orchestrator delegates proposal writing |
| `sdd-spec` | When orchestrator delegates spec writing |
| `sdd-design` | When orchestrator delegates technical design |
| `sdd-tasks` | When orchestrator delegates task breakdown |
| `sdd-apply` | When orchestrator delegates implementation |
| `sdd-verify` | When orchestrator delegates verification |
| `sdd-archive` | When orchestrator delegates change archiving |

## Project Conventions

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project guidance: stack, architecture, conventions, commands |

## Compact Rules

### branch-pr
- Always follow the issue-first enforcement system before creating a PR
- Branch naming follows the associated issue

### issue-creation
- Always create an issue before a PR
- Use structured bug/feature templates

### judgment-day
- Launch two independent blind judge sub-agents simultaneously
- Synthesize findings, apply fixes, re-judge until both pass or escalate after 2 iterations

### go-testing
- Use table-driven tests
- Use teatest for Bubbletea TUI components
- Golden file testing for snapshot-like assertions

### skill-creator
- Follow the Agent Skills spec when creating new skills
- Include frontmatter: name, description, trigger, license, metadata

## Project-Specific Standards (uigen)

- New components: `src/components/<domain>/`
- Tests co-located in `__tests__/` subdirectories
- shadcn/ui components (`src/components/ui/`) must NOT be modified manually
- Model swap point: `src/lib/provider.ts` → `getLanguageModel()`
- Entry point for generated components: `/App.jsx`
- Tailwind-only for styling in generated components
- `@/*` alias maps to `src/*`
