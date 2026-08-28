# Core Coding Agent — Skills Integration Framework

**Version:** 1.0.0 | **Effective:** 2026-08-03 | **Scope:** Project + Global
**Audit Coverage:** 19 skills (3 TRAE built-in + 16 CLI-installed via skills.sh)

---

## PART 1: Complete Skills Audit

### 1.1 TRAE Built-in Skills

#### S01 — TRAE-code-review
| Attribute | Detail |
|-----------|--------|
| **Category** | Code Quality |
| **Source** | TRAE IDE built-in |
| **Trigger** | Code review tasks, merge requests, PR diffs |
| **Input** | Code diff, merge request context |
| **Output** | Structured feedback: quality, correctness, best practices |
| **Limitations** | Requires diff/PR context; not for greenfield code review |
| **Cost Impact** | LOW — reduces review cycle time by ~40% |
| **Quality Impact** | HIGH — enforces consistent review standards |

#### S02 — TRAE-debugger
| Attribute | Detail |
|-----------|--------|
| **Category** | Debugging |
| **Source** | TRAE IDE built-in |
| **Trigger** | Complex bugs not diagnosable by static analysis |
| **Input** | Bug report, reproduction steps, code context |
| **Output** | Debug Server HTTP logs, instrumented trace data |
| **Workflow** | Hypothesize → Instrument → Reproduce → Analyze → Fix → Verify |
| **Limitations** | Requires running application; not for compile-time errors |
| **Cost Impact** | HIGH reduction — saves ~60% debugging time |
| **Quality Impact** | HIGH — scientific method prevents guess-fixing |

#### S03 — TRAE-generate-mini-app
| Attribute | Detail |
|-----------|--------|
| **Category** | Code Generation |
| **Source** | TRAE IDE built-in |
| **Trigger** | Mini-program, Taro, WeChat mini-program tasks |
| **Input** | Feature specification |
| **Output** | Runnable multi-platform mini-program code |
| **Limitations** | Taro/WeChat-specific; not for web or native apps |
| **Cost Impact** | Niche — only relevant for mini-program projects |
| **Quality Impact** | HIGH for mini-program domain |

### 1.2 Core Development Skills (CLI-Installed)

#### S04 — brainstorming
| Attribute | Detail |
|-----------|--------|
| **Category** | Planning |
| **Source** | Skills CLI (101-skills/skills) |
| **Trigger** | **MANDATORY before any creative work** — features, components, functionality |
| **Input** | User intent, project context |
| **Output** | Structured requirements, design approach, alternatives |
| **Limitations** | Only for creative/non-trivial work; skip for mechanical edits |
| **Cost Impact** | MEDIUM — adds a planning step but prevents rework |
| **Quality Impact** | HIGH — prevents misaligned implementations |

#### S05 — vercel-react-best-practices
| Attribute | Detail |
|-----------|--------|
| **Category** | Performance |
| **Source** | Skills CLI (vercel-labs/agent-skills, 185K+ installs) |
| **Trigger** | React/Next.js code: writing, reviewing, refactoring |
| **Input** | React/Next.js component code |
| **Output** | Performance optimization patterns from Vercel Engineering |
| **Limitations** | React/Next.js only |
| **Cost Impact** | MEDIUM — prevents performance regressions |
| **Quality Impact** | HIGH — Vercel-official performance patterns |

#### S06 — vercel-react-view-transitions
| Attribute | Detail |
|-----------|--------|
| **Category** | Animation |
| **Source** | Skills CLI (vercel-labs/agent-skills) |
| **Trigger** | Page transitions, route animations, shared element animations |
| **Input** | React components with navigation |
| **Output** | View Transition API implementations |
| **Limitations** | Requires browser support for View Transitions API |
| **Cost Impact** | LOW — targeted to specific animation needs |
| **Quality Impact** | MEDIUM — native-feeling animations without libraries |

#### S07 — skill-creator
| Attribute | Detail |
|-----------|--------|
| **Category** | Meta |
| **Source** | Skills CLI |
| **Trigger** | **MANDATORY** when creating any new skill |
| **Input** | Skill concept and scope |
| **Output** | Structured skill package |
| **Limitations** | Only for skill creation tasks |
| **Cost Impact** | Niche — only for skill authoring |
| **Quality Impact** | HIGH — ensures skills follow standards |

### 1.3 UI/UX & Design Skills

#### S08 — frontend-design
| Attribute | Detail |
|-----------|--------|
| **Category** | Design |
| **Source** | Skills CLI (anthropics/skills, 100K+ installs) |
| **Trigger** | Building new UI, reshaping existing UI |
| **Input** | UI requirements, existing design context |
| **Output** | Distinctive visual design, typography, aesthetic direction |
| **Limitations** | Not for functional-only changes |
| **Cost Impact** | MEDIUM — elevates UI quality from template-default |
| **Quality Impact** | HIGH — intentional, non-templated visual design |

#### S09 — design-guide
| Attribute | Detail |
|-----------|--------|
| **Category** | Design System |
| **Source** | Skills CLI (getpaperclipai/paperclip) |
| **Trigger** | Creating/modifying UI components, adding pages |
| **Input** | Component design requirements |
| **Output** | Paperclip UI design system patterns, tokens, composition |
| **Limitations** | Paperclip-specific design system |
| **Cost Impact** | LOW — consistent design system usage |
| **Quality Impact** | MEDIUM — reusable component patterns |

#### S10 — ui-ux-pro-max
| Attribute | Detail |
|-----------|--------|
| **Category** | Design Intelligence |
| **Source** | Skills CLI (nextlevelbuilder/ui-ux-pro-max-skill) |
| **Trigger** | Designing, building, reviewing UI for web/mobile |
| **Input** | Design requirements, platform target |
| **Output** | 84 styles, 192 color palettes, 74 font pairings, 192 product types, 98 UX guidelines |
| **Limitations** | Large skill; load only when needed |
| **Cost Impact** | MEDIUM — comprehensive design database |
| **Quality Impact** | HIGH — searchable design intelligence database |

#### S11 — web-design-guidelines
| Attribute | Detail |
|-----------|--------|
| **Category** | Accessibility & Compliance |
| **Source** | Skills CLI |
| **Trigger** | Review UI, check accessibility, audit design |
| **Input** | UI code or rendered page |
| **Output** | Web Interface Guidelines compliance report |
| **Limitations** | Review/audit only; doesn't auto-fix |
| **Cost Impact** | LOW — catches issues before they ship |
| **Quality Impact** | HIGH — ensures WCAG 2.1 AA compliance |

### 1.4 Browser & Automation Skills

#### S12 — agent-browser
| Attribute | Detail |
|-----------|--------|
| **Category** | Browser Automation |
| **Source** | Skills CLI (vercel-labs/agent-browser) |
| **Trigger** | Website interaction, form filling, screenshots, data extraction, web app testing |
| **Input** | URL, interaction steps |
| **Output** | Page content, screenshots, extracted data |
| **Limitations** | Overlaps with Puppeteer/Playwright MCPs; prefers MCP tools |
| **Cost Impact** | LOW — fallback when MCPs unavailable |
| **Quality Impact** | MEDIUM — duplicates MCP capability |

#### S13 — browser-use
| Attribute | Detail |
|-----------|--------|
| **Category** | Browser Automation |
| **Source** | Skills CLI (browser-use/browser-use) |
| **Trigger** | CDP-based browser control |
| **Input** | Browser actions via CDP |
| **Output** | Direct browser manipulation |
| **Limitations** | Overlaps with Chrome DevTools MCP; prefers MCP |
| **Cost Impact** | LOW — CDP-level access for specialized cases |
| **Quality Impact** | LOW — MCP tools preferred for browser tasks |

### 1.5 Animation & Media Skills

#### S14 — hyperframes-animation
| Attribute | Detail |
|-----------|--------|
| **Category** | Animation |
| **Source** | Skills CLI (heygen-com/hyperframes) |
| **Trigger** | Any motion or animation task |
| **Input** | Animation requirements, target runtime (GSAP, Lottie, Three.js, CSS, etc.) |
| **Output** | Atomic motion rules, multi-phase blueprints, transitions |
| **Limitations** | Complex skill with many sub-modules; use selectively |
| **Cost Impact** | MEDIUM — specialized animation framework |
| **Quality Impact** | HIGH — 7 runtime adapters, deterministic timeline |

#### S15 — remotion-best-practices
| Attribute | Detail |
|-----------|--------|
| **Category** | Video Production |
| **Source** | Skills CLI (remotion-dev/skills) |
| **Trigger** | Remotion video tasks |
| **Input** | Video requirements |
| **Output** | Remotion composition best practices, captions, interactivity |
| **Limitations** | Remotion-specific |
| **Cost Impact** | Niche — Remotion video domain only |
| **Quality Impact** | HIGH for Remotion projects |

#### S16 — ai-video-generation
| Attribute | Detail |
|-----------|--------|
| **Category** | AI Media |
| **Source** | Skills CLI |
| **Trigger** | AI video generation (text-to-video, image-to-video) |
| **Input** | Prompts, reference images |
| **Output** | Generated videos via Google Veo, Seedance, etc. (40+ models) |
| **Limitations** | Requires inference.sh API access |
| **Cost Impact** | HIGH — API costs per generation |
| **Quality Impact** | MEDIUM — depends on model selection |

### 1.6 Discovery & Meta Skills

#### S17 — find-skills
| Attribute | Detail |
|-----------|--------|
| **Category** | Discovery |
| **Source** | Skills CLI |
| **Trigger** | User asks "how do I do X", "find a skill for X" |
| **Input** | User query about capability |
| **Output** | Skill recommendations with install commands |
| **Limitations** | Requires network access to skills.sh |
| **Cost Impact** | LOW — discovery only, no execution cost |
| **Quality Impact** | HIGH — prevents reinventing existing skills |

#### S18 — web-search
| Attribute | Detail |
|-----------|--------|
| **Category** | Research |
| **Source** | Skills CLI |
| **Trigger** | Web search, research, fact-checking |
| **Input** | Search query |
| **Output** | Search results via Tavily/Exa |
| **Limitations** | Requires network access |
| **Cost Impact** | LOW — search API calls are inexpensive |
| **Quality Impact** | MEDIUM — fills knowledge gaps without manual searching |

#### S19 — grill-me
| Attribute | Detail |
|-----------|--------|
| **Category** | Code Review |
| **Source** | Skills CLI |
| **Trigger** | Code review mock/interview practice, thorough code review |
| **Input** | Code to review |
| **Output** | Aggressive, thorough review feedback |
| **Limitations** | Review/interview style; may be overly critical |
| **Cost Impact** | LOW — specialized review format |
| **Quality Impact** | MEDIUM — rigorous review style for critical code |

---

## PART 2: Cost-Benefit Analysis & Prioritization

### 2.1 Scoring Methodology

Each skill scored 1-10 across four dimensions:
- **Q** = Quality Impact (improves output quality)
- **T** = Time Savings (reduces development time)
- **C** = Cost Efficiency (low execution cost vs value)
- **F** = Frequency (how often it applies)

**Priority Score = (Q × 2) + (T × 2) + C + F**

### 2.2 Prioritization Table

| # | Skill | Q | T | C | F | Score | Tier | Activation |
|---|-------|---|---|---|---|---|-------|------|-------------|
| S04 | brainstorming | 9 | 7 | 6 | 9 | **47** | CRITICAL | Auto-trigger before creative work |
| S05 | vercel-react-best-practices | 9 | 6 | 7 | 9 | **46** | HIGH | Auto-trigger on React/Next.js code |
| S01 | TRAE-code-review | 8 | 8 | 8 | 8 | **48** | HIGH | Trigger on review tasks |
| S02 | TRAE-debugger | 9 | 9 | 5 | 5 | **46** | HIGH | Trigger on complex bugs |
| S11 | web-design-guidelines | 8 | 5 | 8 | 8 | **45** | HIGH | Trigger on UI review requests |
| S08 | frontend-design | 8 | 6 | 6 | 7 | **41** | HIGH | Trigger on new UI creation |
| S10 | ui-ux-pro-max | 8 | 7 | 5 | 6 | **40** | MEDIUM | Trigger on UI design tasks |
| S18 | web-search | 6 | 7 | 9 | 8 | **43** | MEDIUM | Trigger on research needs |
| S06 | vercel-react-view-transitions | 7 | 6 | 7 | 5 | **38** | MEDIUM | Trigger on animation tasks |
| S14 | hyperframes-animation | 7 | 7 | 5 | 4 | **36** | MEDIUM | Trigger on animation tasks |
| S17 | find-skills | 7 | 5 | 9 | 6 | **39** | MEDIUM | Trigger on unknown capabilities |
| S09 | design-guide | 6 | 5 | 7 | 5 | **34** | LOW | Trigger on component creation |
| S12 | agent-browser | 6 | 6 | 6 | 4 | **34** | LOW | Fallback for MCP tools |
| S13 | browser-use | 5 | 5 | 6 | 3 | **29** | LOW | Fallback for MCP tools |
| S19 | grill-me | 6 | 4 | 7 | 4 | **35** | LOW | On explicit request |
| S07 | skill-creator | 8 | 5 | 5 | 2 | **33** | LOW | On skill creation only |
| S16 | ai-video-generation | 5 | 5 | 4 | 2 | **28** | LOW | On explicit request |
| S15 | remotion-best-practices | 7 | 6 | 5 | 2 | **33** | LOW | Remotion projects only |
| S03 | TRAE-generate-mini-app | 7 | 7 | 5 | 1 | **33** | LOW | Mini-program projects only |

### 2.3 Cost Savings Projections

| Benefit Category | Estimated Savings | Driven By |
|-----------------|-------------------|-----------|
| Review cycle time | -40% | TRAE-code-review |
| Debugging time | -60% | TRAE-debugger |
| Rework from misalignment | -50% | brainstorming |
| Performance regressions | -30% | vercel-react-best-practices |
| Accessibility violations | -70% | web-design-guidelines |
| UI quality consistency | +40% | frontend-design, ui-ux-pro-max |
| **Net annual dev time savings** | **~25-35%** | Combined skill usage |

---

## PART 3: Project-Specific Skill Activation Rules

### 3.1 Auto-Trigger Rules

The agent SHALL automatically invoke these skills when conditions match:

| Condition | Skill | Rule |
|-----------|-------|------|
| Any creative feature, component, or functionality work | brainstorming | **MANDATORY** — invoke BEFORE writing any code |
| Creating/modifying React or Next.js components | vercel-react-best-practices | Auto-trigger to validate patterns |
| Receiving a code review request or PR diff | TRAE-code-review | Auto-trigger for structured feedback |
| Bug not solvable by static analysis in first pass | TRAE-debugger | Auto-trigger when first fix fails |
| User requests UI review or accessibility check | web-design-guidelines | Auto-trigger for compliance audit |
| Building new UI from scratch | frontend-design | Auto-trigger for visual direction |
| Requesting external documentation or current info | web-search | Auto-trigger for research |
| Unknown capability requested by user | find-skills | Auto-trigger to discover if skill exists |
| Any MANDATORY reasoning task (per Rule 14 IRP) | brainstorming + Sequential Thinking MCP | **DUAL-TOOL** — invoke both simultaneously in same turn |

### 3.1.1 Rule 14 — Integrated Reasoning Protocol (Dual-Tool)

The brainstorming skill (S04) and Sequential Thinking MCP MUST be used as an
integrated reasoning pipeline. See `.trae/rules/integrated-reasoning-protocol.md`
for the full protocol.

| Condition | Tools | Pattern |
|-----------|-------|---------|
| Architecture, new features, auth, ambiguous requirements | brainstorming + ST | **Parallel** — both in same turn |
| Refactoring >3 files, performance, API changes | brainstorming + ST | **Parallel or interleaved** |
| Single-file edits, docs, formatting | Neither | **FAST-PATH** — skip evaluation |

Speed optimizations: parallel invocation cuts latency by 40-50%; FAST-PATH
exclusions eliminate overhead on mechanical tasks; cached ST templates skip
iterative reasoning for common decision archetypes.

### 3.2 Manual Trigger Rules (On Request Only)

| Skill | Activation Criteria |
|-------|-------------------|
| grill-me | Only when user explicitly requests aggressive review |
| ai-video-generation | Only when user explicitly requests video generation |
| skill-creator | Only when user explicitly requests skill creation |
| remotion-best-practices | Only for Remotion project tasks |
| TRAE-generate-mini-app | Only for mini-program project tasks |
| hyperframes-animation | Only when animation task explicitly needs framework |

### 3.3 Fallback Rules (Use Only When MCP Unavailable)

| Skill | Falls Back From | Priority |
|-------|----------------|----------|
| agent-browser | Puppeteer/Playwright MCP | Use MCP first, skill only if MCP fails |
| browser-use | Chrome DevTools MCP | Use MCP first, skill only if MCP fails |

### 3.4 Quality Checkpoints

Before any skill invocation, agent SHALL verify:

- [ ] Skill is applicable to the current task type
- [ ] No higher-priority tool (MCP) already covers this capability
- [ ] Skill invocation won't exceed rate limits or tool budget
- [ ] Input context is sufficient for the skill to produce useful output
- [ ] Skill output will be logged in agent-log.md with outcome

---

## PART 4: Global Cross-Project Standards

### 4.1 Skill Usage Principles (All Projects)

1. **MCP-First, Skill-Second**: Always prefer MCP tools over skills when both cover the same capability. MCP tools are directly integrated; skills add invocation overhead.
2. **No Speculative Invocation**: Never invoke a skill "just in case." Only invoke when the trigger condition is met and the skill's output is needed.
3. **Log Every Invocation**: Every skill invocation must be recorded in that project's `.trae/agent-log.md` with: skill name, task context, outcome, time saved.
4. **Respect Rate Limits**: Max 3 skill invocations per agent turn. Max 5 per task.
5. **Cascade Rule**: If a skill recommends another skill, evaluate the recommendation but don't chain-call without re-evaluating applicability.

### 4.2 Compliance Requirements

| Requirement | Standard |
|-------------|----------|
| brainstorming invocation before creative work | 100% compliance required |
| vercel-react-best-practices on React/Next.js work | 95% compliance target |
| TRAE-code-review on review tasks | 100% compliance required |
| Skill logging to agent-log.md | 100% compliance required |
| MCP-priority over overlapping skills | Strict enforcement |

### 4.3 Security Standards

- No skill shall receive secrets, API keys, or credentials as input.
- Skills that require external API access (web-search, ai-video-generation) must confirm network availability before invocation.
- Skill output containing sensitive data must be redacted before logging.
- Skills from unverified sources (not vercel-labs, anthropics, remotion-dev, or verified publishers) require manual user approval before first use.

### 4.4 Resource Allocation

| Resource | Limit | Scope |
|----------|-------|-------|
| Skill invocations per turn | 3 max | Per agent turn |
| Skill invocations per task | 5 max | Per complete task |
| Concurrent skill + MCP calls | 5 total | Combined |
| web-search API calls | 10/day | Per project |
| ai-video-generation | 3/day | Per project |

---

## PART 5: Monitoring Mechanism

### 5.1 Tracked Metrics

| Metric | Baseline (2026-08-03) | Target |
|--------|----------------------|--------|
| brainstorming invocation rate | 0% (not enforced) | 100% before creative work |
| vercel-react-best-practices usage | 0% | 95% on React/Next.js tasks |
| TRAE-code-review usage | 0% | 100% on review tasks |
| Bug fix success rate (first attempt) | Unknown | +40% with TRAE-debugger |
| UI accessibility violations caught | Unknown | +70% with web-design-guidelines |
| Rework instances per feature | Unknown | -50% with brainstorming |
| Skill invocation success rate | Unknown | ≥ 95% |
| Average skills used per task | 0 | 2-3 |

### 5.2 Monitoring Log Format

Every skill invocation logged to `.trae/agent-log.md`:

```
[YYYY-MM-DD HH:MM] | SKILL:<skill-name> | <task-id> | <outcome> | <time-saved-estimate>
```

### 5.3 Weekly Audit Checklist

- [ ] Review skill invocation log for compliance violations
- [ ] Check brainstorming was used before all creative work
- [ ] Verify MCP-priority rule was followed (no unnecessary skill usage)
- [ ] Report any skill failures (3+ consecutive failures = skill flagged)
- [ ] Update metrics in `.trae/metrics/skills-weekly.md`

---

## PART 6: Auto-Enforcement System

### 6.1 File Placement for All Projects

To ensure these rules apply to ALL projects (existing and future), the framework MUST exist at both levels:

| Location | Purpose |
|----------|---------|
| `c:\Users\Momolili\.trae\rules\skills-framework.md` | **GLOBAL** — Applies to all projects automatically |
| `<project>\.trae\rules\skills-framework.md` | **PROJECT** — Project-specific overrides |
| `<project>\AGENTS.md` | **PORTABLE** — References skills framework |

### 6.2 Enforcement Triggers

The agent SHALL:

1. **On task start**: Check if task type matches any auto-trigger skill. If so, invoke before proceeding.
2. **Before writing code**: Verify brainstorming was invoked (for creative tasks).
3. **On review request**: Verify TRAE-code-review is invoked.
4. **After task completion**: Verify all skill invocations were logged.

### 6.3 Non-Compliance Actions

| Violation | Action |
|-----------|--------|
| Skipped brainstorming on creative task | Agent flags as NON-COMPLIANT, logs warning |
| Used skill where MCP tool exists | Agent logs efficiency warning |
| Skill invocation not logged | Agent logs missing entry |
| 3+ compliance violations in one task | Escalate to user with violation report |

---

## PART 7: Verification Checklist

- [ ] `skills-framework.md` exists at global rules directory
- [ ] `skills-framework.md` exists at project `.trae/rules/`
- [ ] `AGENTS.md` updated to reference skills framework
- [ ] `agent-log.md` contains skill invocation format template
- [ ] Test: brainstorming auto-triggered before creative task
- [ ] Test: vercel-react-best-practices auto-triggered on React code
- [ ] Test: MCP priority rule prevents unnecessary skill usage
- [ ] Test: All skill invocations logged with proper format
