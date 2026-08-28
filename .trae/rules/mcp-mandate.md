# Rule 16 — MCP Usage Mandate

**Version:** 1.0.0 | **Effective:** 2026-08-14 | **Scope:** Project
**Mandatory:** YES — Agents MUST use MCP tools before falling back to any other method

---

## 1. RULE STATEMENT

Agents MUST proactively use MCP tools for any capability an enabled MCP server
provides. MCP tools are the **default, preferred execution path** for their
domain. Generic alternatives (manual shell scripts, ad-hoc browser automation,
hardcoded data, web scraping by hand) are only allowed when no MCP tool exists
or every available MCP tool has failed.

## 2. AVAILABLE SERVERS (All Verified 2026-08-03)

| # | Server | Tools | Domain |
|---|--------|-------|--------|
| 1 | integrated_web-dev | 6 | Supabase, Stripe, LLM config, Vercel deploy |
| 2 | mcp_Chrome_DevTools_MCP | 29 | Browser debugging, performance, Lighthouse |
| 3 | mcp_Firebase | 12 | Firestore CRUD, auth, storage |
| 4 | mcp_GitHub | 27 | Issues, PRs, repos, code search |
| 5 | mcp_Memory | 9 | Entity/relation knowledge graph |
| 6 | mcp_Multi_Fetch | 5 | HTTP fetch (html, json, txt, markdown) |
| 7 | mcp_Persistent_Knowledge_Graph | 11 | Knowledge graph + update operations |
| 8 | mcp_Playwright | 33 | Full browser automation, codegen, PDF |
| 9 | mcp_Puppeteer | 7 | Lightweight browser automation |
| 10 | mcp_Sequential_Thinking | 1 | Structured reasoning |
| 11 | mcp_context7 | 2 | Library/framework docs lookup |
| 12 | mcp_shadcn-ui | 7 | Component registry search |

## 3. MANDATORY USAGE — MCP-First Dispatch Table

| Task | MCP Tool to Use | Fallback Allowed? |
|------|-----------------|-------------------|
| Firestore/Firebase data access | mcp_Firebase | No |
| GitHub repo/issue/PR operations | mcp_GitHub | No |
| Fetching an external URL | mcp_Multi_Fetch | No |
| Storing/reading project knowledge | mcp_Memory or mcp_Persistent_Knowledge_Graph | No |
| Complex reasoning / problem-solving | mcp_Sequential_Thinking | No |
| Library/framework docs lookup | mcp_context7 | No |
| shadcn/ui component research | mcp_shadcn-ui | No |
| Browser testing / e2e / form filling | mcp_Playwright | No |
| Quick UI verification / screenshots | mcp_Puppeteer | No |
| Performance debugging / Lighthouse | mcp_Chrome_DevTools_MCP | No |
| Supabase / Stripe / deploy config | integrated_web-dev | No |

## 4. MCP-FIRST, SKILL-SECOND

1. When a Skill (e.g. agent-browser, browser-use) and an MCP tool cover the
   same capability, the MCP tool wins. Skills are fallbacks only when the MCP
   server is unavailable.
2. MCP tools are directly integrated; Skills add invocation overhead. Do not
   invoke a Skill for something an MCP tool already does.
3. Rate limits per `.trae/rules/skills-framework.md` (max 3 skill invocations
   per turn, 5 per task) do NOT apply to MCP tools, but still avoid redundant
   calls.

## 5. OPERATIONAL PROTOCOL (Rule 13)

1. **Schema check first:** Before invoking any MCP tool, read its descriptor
   (LS + Read) and match args exactly. Never guess parameters.
2. **Log every invocation:** Record server, tool, duration, and status in
   `.trae/agent-log.md`.
3. **Retry discipline:** Retry only idempotent tools. After 3 consecutive
   failures, stop retrying and either use a fallback or escalate to the user.
4. **Never embed secrets:** API keys, tokens, and passwords must never be
   passed to MCP tools or written to logs.
5. **Health checks:** On startup or before long tasks, verify critical MCP
   servers respond (e.g. `read_graph` on Memory, a navigation on Puppeteer).

## 6. COMPLIANCE VALIDATION

During Stage 4 Self-Review, the agent asks:

1. Did this task involve a domain an MCP server covers?
   - YES + MCP tool used → COMPLIANT
   - YES + MCP tool NOT used → **VIOLATION** — log it with the reason
2. Was an MCP tool skipped in favor of a Skill or manual method?
   - Only allowed if the MCP server failed 3× or is genuinely unavailable.

| Violation | Action |
|-----------|--------|
| MCP tool available but not used for its domain | HIGH — log violation, explain why |
| MCP invoked without schema check | MEDIUM — log format warning |
| MCP failure not escalated after 3 attempts | HIGH — log, escalate to user |
| Secret passed through MCP call | CRITICAL — halt, flag, rotate secret |

## 7. SUCCESS CRITERIA

| Metric | Target |
|--------|--------|
| MCP usage for covered domains | 100% |
| Schema check before invocation | 100% |
| Invocations logged to agent-log.md | 100% |
| Escalation after 3 consecutive failures | 100% |

## 8. FILE PLACEMENT

| Location | Purpose |
|----------|---------|
| `<project>\.trae\rules\mcp-mandate.md` | **PROJECT** — Per-project overrides |
| `<project>\.trae\rules\agent-rules.md` | Updated with Rule 16 reference |
| `<project>\AGENTS.md` | Updated (8→9 rules) |
