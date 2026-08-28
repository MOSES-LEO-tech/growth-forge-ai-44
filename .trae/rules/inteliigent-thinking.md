# Rule 14 — Integrated Reasoning Protocol (IRP)

**Version:** 1.0.0 | **Effective:** 2026-08-03 | **Scope:** Global + Project
**Mandatory:** YES — Applies to all agent workflows involving reasoning or problem-solving

---

## 1. RULE STATEMENT

The agent MUST simultaneously utilize both the **brainstorming skill** (S04) and the
**Sequential Thinking MCP** (mcp_Sequential_Thinking) as an integrated reasoning
pipeline during all applicable workflows. These tools are NOT to be used in
isolation — they form a single, complementary reasoning system.

- **brainstorming** = divergent thinking (exploration, options, creative intent)
- **Sequential Thinking** = convergent thinking (structured chains, logic verification, trade-off analysis)

Together they produce more comprehensive, structured, and creative outcomes than
either tool alone.

---

## 2. TRIGGERING CONDITIONS — 3-TIER MODEL

### 2.1 MANDATORY (Both tools MUST be invoked — agent halts and flags non-compliance)

| Trigger | Detection Signal |
|---------|-----------------|
| Architecture/design decisions | Task involves system structure, component boundaries, data modeling |
| New feature creation | Greenfield feature, new module, new API endpoint |
| Cross-cutting concerns | Auth, payments, data integrity, security boundaries |
| Ambiguous requirements | User request lacks clear specs; multiple valid interpretations exist |
| Bug root-cause analysis | Bug not solvable by static analysis in first pass |
| Multi-system integration | Connecting two or more services/APIs/systems |

### 2.2 RECOMMENDED (Both tools SHOULD be invoked — agent logs reason if skipped)

| Trigger | Detection Signal |
|---------|-----------------|
| Refactoring >3 files | Cross-file changes touching multiple modules |
| Performance optimization | Task explicitly mentions performance/latency/bundle size |
| Dependency decisions | Adding/removing/upgrading major dependencies |
| API contract changes | Modifying request/response shapes or database schema |

### 2.3 OPTIONAL (Agent discretion — no compliance check)

| Trigger | Detection Signal |
|---------|-----------------|
| Single-file edits | Change confined to one file, <50 lines |
| Documentation/comments | Adding/updating docs, JSDoc, README |
| Boilerplate CRUD | Standard create/read/update/delete with no novel logic |
| Formatting/linting | Style fixes, import organization |

### 2.4 FAST-PATH EXCLUSIONS (Skip evaluation entirely — instant bypass)

| Exclusion | Reason |
|-----------|--------|
| Task is a direct user command with zero ambiguity | "rename X to Y", "format this file" |
| Task is a continuation of a previously-approved plan | Already reasoned through |
| Task is purely mechanical | Copy, move, delete files with no logic changes |
| Agent is in read-only mode | No implementation decisions being made |

---

## 3. INTEGRATED USAGE PATTERN (Speed-Optimized)

### 3.1 Parallel First (Primary Pattern)

Both tools are invoked **simultaneously** in the same tool call batch to minimize
latency. This cuts total time from `T_brainstorm + T_st` to `max(T_brainstorm, T_st)`.

```
TASK RECEIVED → MANDATORY trigger detected
    │
    ├── [PARALLEL — same turn]
    │   ├── Skill: brainstorming  → explores intent, proposes approaches
    │   └── MCP: sequentialthinking → structures reasoning in parallel
    │
    └── Converged output: creative options + structured validation
```

### 3.2 Interleaved Decision Points (Secondary Pattern)

For complex tasks where parallel invocation isn't sufficient, interleave at
natural decision boundaries:

```
brainstorming explores → hits decision point
    │
    ├── Sequential Thinking: structured chain for THIS decision
    │   (thought 1 → thought 2 → ... → decision)
    │
    └── brainstorming resumes with decision informed by ST
```

### 3.3 Timeout Gate

If either tool produces **no useful output within 2 iterations**:
- Abort that tool
- Log: `DUAL-TOOL:TIMEOUT:<tool> — proceeding with single tool`
- Do NOT retry; proceed with available output

### 3.4 Cached Decision Patterns

Common decision archetypes have pre-defined ST templates. When a task matches
a known archetype, use the cached template to skip the iterative reasoning:

| Archetype | ST Template |
|-----------|------------|
| Auth flow decision | thought: auth method → session strategy → token storage → edge cases |
| Data model design | thought: entities → relationships → constraints → migration risk |
| API endpoint design | thought: resource → method → input validation → error responses → rate limit |
| Component architecture | thought: props interface → state location → data flow → render conditions |
| Dependency choice | thought: requirement → candidates → bundle impact → maintenance risk → decision |

---

## 4. COMPLIANCE VALIDATION

### 4.1 Embedded in Stage 4 Self-Review (Speed-Optimized)

The dual-tool compliance check is **folded into** the existing Stage 4 Self-Review
step of the 5-stage workflow. No separate step — adds zero overhead.

Agent asks itself during self-review:

1. **Trigger check:** Did this task match any MANDATORY trigger? (see §2.1)
   - YES → were both tools invoked? NO → **COMPLIANCE_VIOLATION** logged
   - YES → were both tools invoked? YES → **COMPLIANT**
   - NO → skip to question 2

2. **RECOMMENDED check:** Did this task match any RECOMMENDED trigger? (see §2.2)
   - YES + both skipped → log reason
   - YES + one used → note the gap, not a violation

3. **Integration quality:** Were tools used in integrated fashion?
   - Check: were they invoked in the same turn (parallel) or interleaved?
   - NOT: were they invoked in entirely separate turns with no cross-reference?
   - If isolated → log `DUAL-TOOL:ISOLATED — not integrated`

### 4.2 Violation Actions

| Violation | Action |
|-----------|--------|
| MANDATORY task, no tools invoked | CRITICAL — halt, flag, escalate to user |
| MANDATORY task, only one tool | HIGH — log violation, note missing tool |
| RECOMMENDED task, both skipped without reason | MEDIUM — log warning |
| Isolated usage (not integrated) | LOW — log improvement note |

---

## 5. TESTING PROTOCOLS

### 5.1 Test Scenarios

| Test | Trigger Tier | Input | Expected |
|------|-------------|-------|----------|
| **T1** | MANDATORY | "Design the auth system for this app" | Both tools invoked in same turn. ST chain ≥3 thoughts. |
| **T2** | MANDATORY | "Debug why payments are failing intermittently" | Both invoked. ST with hypothesis chain. |
| **T3** | RECOMMENDED | "Refactor the user module — it's in 4 files" | Both invoked OR reason logged for skip. |
| **T4** | RECOMMENDED | "Optimize the bundle — it's 2MB" | Both invoked OR reason logged. |
| **T5** | OPTIONAL | "Add a JSDoc comment to getUser" | Neither tool invoked. No violation. |
| **T6** | FAST-PATH | "Rename utils.ts to helpers.ts" | Evaluation skipped. Immediate execution. |
| **T7** | EDGE CASE | Task where only one tool is clearly needed | Agent notes which tool was not needed and why. |

### 5.2 Speed Benchmarks

| Scenario | Baseline (sequential) | Target (parallel) | Improvement |
|----------|----------------------|-------------------|-------------|
| Simple MANDATORY task | T_bs + T_st | max(T_bs, T_st) | -40-50% |
| Complex interleaved task | T_bs + n×T_st | max(T_bs, T_st) + (n-1)×T_st | -30% |
| FAST-PATH exclusion | T_eval + T_exec | T_exec | -100% of eval overhead |

---

## 6. SUCCESS CRITERIA

| Criterion | Baseline | Target | Measurement |
|-----------|----------|--------|-------------|
| MANDATORY compliance rate | 0% | 100% | Self-audit at Stage 4 per task |
| RECOMMENDED usage rate | 0% | ≥ 80% | Logged invocations / eligible tasks |
| Integrated (not isolated) rate | N/A | ≥ 90% | Same-turn or interleaved invocations |
| FAST-PATH bypass accuracy | N/A | 100% | No false positives in exclusion |
| Rework cycles per feature | Unknown | -50% | Count per feature in agent-log.md |
| Edge cases caught pre-review | Unknown | +40% | ST chains referencing edge cases |
| Tool invocation latency | Sequential | Parallel ≤ max(single tool) | Measured in agent-log.md timestamps |

---

## 7. FILE PLACEMENT

| Location | Purpose |
|----------|---------|
| `c:\Users\Momolili\.trae\rules\integrated-reasoning-protocol.md` | **GLOBAL** — All projects inherit |
| `<project>\.trae\rules\integrated-reasoning-protocol.md` | **PROJECT** — Per-project overrides |
| `<project>\.trae\rules\skills-framework.md` | Updated with S04 + ST integration reference |
| `<project>\.trae\rules\agent-rules.md` | Updated with Rule 14 reference |
