# Core Coding Agent — Operational Rules

## CODE QUALITY GATE

Before marking anything complete, verify:
- Passes existing lint config (zero warnings)
- Passes type-checking (strict mode, zero errors)
- Passes relevant test suite (unit + any touched e2e)
- Has error handling on new I/O or user-input paths
- Has doc comments on new public functions

If you can't verify one of these (no test suite, no lint config), say so
explicitly rather than claiming compliance.

## TRANSPARENCY

- For anything beyond a few tool calls or files, give a progress update.
- State which provider/model/mode you're using when it's not the default.
- State assumptions in your delivery summary, not buried in the diff.
- Log all MCP invocations with duration and status per Rule 13.

## SAFETY

- Never run destructive terminal commands without explicit confirmation:
  rm -rf, force-push, drop table, DROP DATABASE, etc.
- Never edit environment/secrets files (.env, credentials, deploy configs)
  without confirmation, even if the task seems to require it.
- Flag security-sensitive patterns explicitly:
  - Raw string-built SQL
  - Unvalidated input reaching a shell or DB call
  - Hardcoded secrets (API keys, tokens, passwords)
  - Missing authentication checks on sensitive operations

## DECISION LOG

Keep a running log at `.trae/agent-log.md`:
- Task type
- Provider/model/mode used
- Outcome (passed review / needed escalation / got corrected)
- Notes on what worked or didn't

This is a paper trail for manually tuning routing rules — it is not
machine learning, and you should not claim it is.

## COST DISCIPLINE

- Frontier models are roughly 3x fast-tier per token.
- Cache hits run 1/10-1/20 of standard input cost on both tiers.
- Optimize for getting a task right in fewer round-trips over squeezing
  everything onto the cheapest model.
- Keep system prompt stable across calls so cache hits stay high.

## RULE 14 — INTEGRATED REASONING PROTOCOL

For all tasks involving reasoning or problem-solving, the agent MUST
simultaneously utilize both the brainstorming skill and Sequential Thinking
MCP as an integrated pipeline. See `.trae/rules/integrated-reasoning-protocol.md`
for full trigger conditions, compliance validation, and speed benchmarks.

- **MANDATORY**: Architecture, new features, auth/payments, ambiguous requirements, bug analysis, multi-system integration
- **RECOMMENDED**: Refactoring >3 files, performance optimization, dependency decisions, API changes
- **FAST-PATH**: Direct commands, mechanical tasks, previously-approved plans → skip evaluation

## RULE 15 — STRUCTURED Q&A MANDATE

When the agent needs to ask the user a question, it MUST use the
**AskUserQuestion** tool rather than inline text questions. See
`.trae/rules/qa-mandate.md` for full trigger conditions, format
specification, and compliance validation.

- **MANDATORY**: Clarifying requirements, choosing approaches, design preferences, scope decisions, configuration
- **RECOMMENDED**: Follow-up clarifications, preferences with defaults, quick confirmations
- **EXCEPTIONS**: Destructive confirmations, security warnings, NotifyUser calls, trivial yes/no

## RULE 16 — MCP USAGE MANDATE

Agents MUST use MCP tools for any capability an enabled MCP server provides;
MCP is the default execution path over Skills or manual methods. See
`.trae/rules/mcp-mandate.md` for the full MCP-first dispatch table, operational
protocol (schema check, logging, retry discipline), and compliance validation.

- **MANDATORY**: Use the MCP tool for its domain when one exists (Firebase, GitHub, browser automation, fetching, docs lookup, reasoning, knowledge graph)
- **FORBIDDEN**: Reaching for a Skill or manual workaround while an MCP server covers the task
- **ESCALATE**: After 3 consecutive MCP failures, fall back or escalate to the user

## PROJECT RULES PRECEDENCE

Trae's project rules (.trae/rules/) take precedence over personal/global
rules when they conflict. A rule scoped to a module folder applies
automatically when working in that module.

## MCP TOOL BUDGET — ALL SERVERS CONNECTED AND VERIFIED

All 12 MCP servers (~149 tools) are connected and verified working as of
2026-08-03. Every tool is available and tested. Nothing is deferred.

| # | Server | Tools | Status | Domain |
|---|--------|-------|--------|--------|
| 1 | integrated_web-dev | 6 | ✅ Verified | Supabase, Stripe, LLM config, Vercel deploy |
| 2 | mcp_Chrome_DevTools_MCP | 29 | ✅ Verified | Browser debugging, perf, lighthouse |
| 3 | mcp_Firebase | 12 | ✅ Verified | Firestore CRUD, auth, storage |
| 4 | mcp_GitHub | 27 | ✅ Verified | Issues, PRs, repos, code search |
| 5 | mcp_Memory | 9 | ✅ Verified | Entity/relation knowledge graph |
| 6 | mcp_Multi_Fetch | 5 | ✅ Verified | HTTP fetch (html, json, txt, markdown) |
| 7 | mcp_Persistent_Knowledge_Graph | 11 | ✅ Verified | Knowledge graph + update operations |
| 8 | mcp_Playwright | 33 | ✅ Verified | Full browser automation, codegen, PDF |
| 9 | mcp_Puppeteer | 7 | ✅ Verified | Lightweight browser automation |
| 10 | mcp_Sequential_Thinking | 1 | ✅ Verified | Structured reasoning |
| 11 | mcp_context7 | 2 | ✅ Verified | Library/framework docs lookup |
| 12 | mcp_shadcn-ui | 7 | ✅ Verified | Component registry search |

**Verification results (2026-08-03):**
- Multi Fetch: Successfully fetched example.com
- Sequential Thinking: Thought processing confirmed
- Context7: Library resolution returned React docs (6052 snippets)
- shadcn/ui: Registry query responded
- Puppeteer: Navigated to example.com
- Playwright: Navigated to example.com
- Chrome DevTools: Listed browser pages
- GitHub: Searched 7M+ repos for "react"
- Memory: Returned knowledge graph with 7 entities
- Persistent Knowledge Graph: Responded with empty graph
- Firebase: Auth query responded (no user found, expected)
- integrated_web-dev: LLM config status returned
