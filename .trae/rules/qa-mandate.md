# Rule 15 — Structured Q&A Mandate

**Version:** 1.0.0 | **Effective:** 2026-08-03 | **Scope:** Global + Project
**Mandatory:** YES — The agent MUST use the AskUserQuestion tool for all questions to the user

---

## 1. RULE STATEMENT

When the agent needs to ask the user a question, it MUST use the **AskUserQuestion**
tool rather than inline text questions. This ensures every question:

- Has a clear, scannable header (max 12 chars)
- Provides structured multiple-choice options (2-4 per question)
- Includes descriptions explaining each option's implications
- Supports multi-select when choices aren't mutually exclusive
- Renders as a structured UI widget in the IDE, not buried in markdown

**Anti-pattern:** "Which approach should I use? Option A does X, Option B does Y."
**Correct:** `AskUserQuestion({ questions: [{ header: "Approach", question: "Which approach?", options: [...] }] })`

---

## 2. TRIGGERING CONDITIONS

### 2.1 MANDATORY — Use AskUserQuestion (no exceptions)

| Scenario | Example |
|----------|---------|
| Clarifying ambiguous requirements | User says "add authentication" — ask: OAuth, email/password, magic link? |
| Choosing between implementation approaches | "Should I use Server Components or client-side fetching?" |
| Gathering design/UX preferences | "Light mode, dark mode, or system preference?" |
| Deciding scope or feature priority | "Which of these 3 features should I build first?" |
| Configuration decisions | "PostgreSQL or SQLite for this project?" |

### 2.2 RECOMMENDED — Use AskUserQuestion but inline acceptable with reason

| Scenario | Example |
|----------|---------|
| Follow-up clarification within an already-open Q&A flow | Refining an option the user just selected |
| Simple preference with clear defaults | "Use default ESLint config or customize?" (default is clear) |
| Quick confirmation of understanding | "Just to confirm — you want X, correct?" |

### 2.3 EXCEPTIONS — Inline text acceptable, no violation

| Scenario | Reason |
|----------|--------|
| Destructive action confirmations | "Are you sure you want to DROP TABLE users?" — needs immediate, prominent warning |
| NotifyUser calls | Notifications are not questions |
| Trivial yes/no with zero ambiguity | "Shall I proceed?" after presenting a plan |
| Emergency/security warnings | Must not be delayed by structured UI |

---

## 3. STRUCTURED FORMAT SPECIFICATION

### 3.1 Required Fields

Every AskUserQuestion invocation MUST include:

| Field | Requirement |
|-------|------------|
| `questions` | Array of 1-4 question objects |
| `questions[].question` | Clear, complete question ending with `?` |
| `questions[].header` | Very short label, max 12 characters |
| `questions[].options` | Array of 2-4 choices |
| `questions[].options[].label` | Concise option name, 1-5 words |
| `questions[].options[].description` | What this option means or what will happen |
| `questions[].multiSelect` | `true` if multiple options can be selected, `false` otherwise |

### 3.2 Quality Standards

- Lead with the recommended option as the first choice, labeled "(Recommended)"
- Options must be mutually exclusive unless `multiSelect: true`
- Descriptions must explain trade-offs, not repeat the label
- Never use "Other" as an explicit option — the tool provides it automatically

### 3.3 Example

```json
{
  "questions": [
    {
      "question": "Which authentication method should we implement?",
      "header": "Auth Method",
      "options": [
        {
          "label": "OAuth 2.0 (Recommended)",
          "description": "Industry standard, supports Google/GitHub login, less password management"
        },
        {
          "label": "Email/Password",
          "description": "Simpler to implement, full control over user data, requires password reset flow"
        },
        {
          "label": "Magic Link",
          "description": "Passwordless, good UX, requires email service integration"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

---

## 4. COMPLIANCE VALIDATION

### 4.1 Embedded in Stage 4 Self-Review

During self-review, the agent scans for:

1. **Raw-text questions:** Did the agent ask any question in plain markdown instead of using AskUserQuestion?
2. **Trigger match:** Did any of those questions fall under MANDATORY triggers (§2.1)?
3. **Format quality:** Were AskUserQuestion invocations properly structured with header, options, descriptions?

### 4.2 Violation Actions

| Violation | Action |
|-----------|--------|
| MANDATORY question asked as raw text | CRITICAL — log VIOLATION, note which question |
| AskUserQuestion used but missing descriptions | MEDIUM — log format warning |
| AskUserQuestion used but options not clearly distinct | LOW — log improvement note |
| Exception scenario, raw text used | No violation — log as EXCEPTION |

---

## 5. FILE PLACEMENT

| Location | Purpose |
|----------|---------|
| `c:\Users\Momolili\.trae\rules\qa-mandate.md` | **GLOBAL** — All projects inherit |
| `<project>\.trae\rules\qa-mandate.md` | **PROJECT** — Per-project overrides |
| `<project>\.trae\rules\agent-rules.md` | Updated with Rule 15 reference |
| `<project>\AGENTS.md` | Updated (7→8 rules) |
