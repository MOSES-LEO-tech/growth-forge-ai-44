# Smart Buddy — Expanded Layout & Personalities Fix

## Summary

The Smart Buddy expanded-viewport layout is broken (oversized header, vertically-floating persona card, large empty vertical gutters, the persona/description widget visible mid-screen instead of in the header). The personalities list is incomplete on the frontend (only 2 of the 7 backend-supported personas are exposed) and the page (`SmartBuddy.tsx`) ignores the stored personality, so the widget and the full-page view show different personas.

This plan is a focused fix — restyle the expanded dialog so the persona header is the fixed dialog header, the persona card is removed, the input/footer sticks to the bottom, and the message list fills the middle. Then reconcile the personalities list so the frontend exposes all 7 personas that the backend supports, and have both the widget and the page read/write the same persistence key.

## Current State Analysis

### Files in scope

- [SmartBuddyWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/widgets/SmartBuddyWidget.tsx) — dashboard widget with collapsed + expanded (modal) views. Declares a 2-item `personalities` array; persists selection in `localStorage` key `smartbuddy-personality`. The expanded rendering is a `flex flex-col h-full` inside a `flex-1 overflow-y-auto` scroll container — this is the root cause of the layout breakage (the scrollable wrapper steals the viewport height from the inner flex column).
- [SmartBuddy.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/SmartBuddy.tsx) — full-page chat. **Does not** read or persist personality. Header is fine; the persona card does not appear at all here.
- [ExpandableWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/ExpandableWidget.tsx) — generic wrapper. The expanded dialog uses `<div className="flex-1 overflow-y-auto px-1">{expandedContent}</div>` and a `DialogHeader` that calls the title prop. The `expandedContent` in the widget tries to render its own header inside an already-scrollable region; that is the layout root issue.
- [smartbuddy-chat/index.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/supabase/functions/smartbuddy-chat/index.ts) — backend has 7 personas in `personalityPrompts` (`default`, `study-ninja`, `chill-mentor`, `hype-squad`, `science-sage`, `creative-spark`, `life-coach`). The function accepts `personality` from the request body and falls back to `default` if unknown.

### Issues observed

1. **Layout**
   - The persona avatar + name + description card is rendered **inside** the scrollable region of the dialog (mid-screen), not in a fixed header. It is followed by a large empty space above the action buttons.
   - The action button row (Export/Import/Trash/Settings) sits floating in the center because the inner flex column does not span the dialog height.
   - The "Stored privately on this device." footer is at the bottom of the scrolled content instead of the dialog floor.
   - The widget's `expandedContent` was previously inlined as a containing JSX variable — the current code has the outer `flex flex-col h-full` wrapped in a stray `</div>` (line 263) — that needs to be cleaned up.

2. **Personalities**
   - Frontend widget exposes only 2 (`default`, `study-ninja`) — limiting choice and inconsistent with backend.
   - The full-page [SmartBuddy.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/SmartBuddy.tsx) has no personality selector at all, even though the hook persists it.
   - Frontend and backend are disconnected — there is no shared source of truth for persona ids/names/emojis/descriptions.

## Proposed Changes

### 1. Single source of truth for personalities

Create `src/lib/smartBuddyPersonalities.ts` exporting:

```ts
export type Personality = {
  id: string;          // matches backend personalityPrompts key
  name: string;
  emoji: string;
  description: string; // short, 1-line, ≤28 chars
  greeting: string;    // shown when local history is empty
};

export const PERSONALITIES: Personality[] = [
  { id: "default",        name: "SmartBuddy",   emoji: "��", description: "Friendly & encouraging",        greeting: "Hey there, superstar. I'm SmartBuddy — your friendly learning companion. How can I help make your day easier?" },
  { id: "study-ninja",    name: "Study Ninja",  emoji: "��", description: "Disciplined, focused, productive", greeting: "Ready to crush those goals? �� I'm Study Ninja — let's get focused and make progress happen!" },
  { id: "chill-mentor",   name: "Chill Mentor", emoji: "��", description: "Calm, thoughtful, low-pressure",  greeting: "Take a breath. �� I'm Chill Mentor — let's make steady progress, no pressure." },
  { id: "hype-squad",     name: "Hype Squad",   emoji: "��", description: "Energetic, celebratory",          greeting: "LET'S GO! �� I'm Hype Squad — what are we tackling today?" },
  { id: "science-sage",   name: "Science Sage", emoji: "��", description: "Curious, analytical, clear",       greeting: "Curious question! �� I'm Science Sage — let's break it down together." },
  { id: "creative-spark", name: "Creative Spark", emoji: "✨", description: "Imaginative, idea-driven",      greeting: "Ooh, fun! ✨ I'm Creative Spark — let's brainstorm something original." },
  { id: "life-coach",     name: "Life Coach",   emoji: "��", description: "Goals, habits, accountability",  greeting: "Hey! �� I'm Life Coach — let's set a goal and make a plan." },
];

export const PERSONALITY_STORAGE_KEY = "smartbuddy-personality";

export const getPersonality = (id: string | null | undefined): Personality =>
  PERSONALITIES.find(p => p.id === id) ?? PERSONALITIES[0];
```

Seven personas, ids match the backend `personalityPrompts` keys exactly. Backend doesn't need to change. The fallback `getPersonality` guards against unknown ids.

### 2. Fix the expanded layout

Update [SmartBuddyWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/widgets/SmartBuddyWidget.tsx) so the expanded view is a proper `flex flex-col` that fills the dialog body, with the persona chip in the header, scroll area in the middle, and input pinned to the bottom.

Concretely:

- Remove the duplicate "persona card" block from inside the expanded content (it was already represented in the dialog header by the `icon` slot — but the icon is a `Bot` icon, not the persona emoji). Promote the persona avatar + name + description to the dialog header next to the title.
- Replace the inner `flex flex-col h-full` with a layout that gives the `<ScrollArea>` `flex-1` and the input bar a fixed height at the bottom.
- Add a `flex-shrink-0` to the input/footer so it never scrolls away.
- Remove the stray `</div>` on line 263 (the closing tag no longer matches the new structure).
- The collapsed view continues to show the persona greeting/avatar/mini-chat — unchanged.

To put the persona in the dialog header, pass a richer `icon` prop into `ExpandableWidget`, OR keep the widget's own header inside the expanded content first row. The cleaner option (lowest impact to `ExpandableWidget`) is to keep the widget's own header inside the expanded content but pin it with `flex-shrink-0` and put the scroll area in `flex-1`. This avoids changing `ExpandableWidget`'s public contract.

Revised expanded structure (in JSX):

```tsx
expandedContent={
  <div className="flex h-full flex-col">
    {/* Persona + actions header */}
    <div className="flex flex-shrink-0 items-center justify-between border-b pb-3 mb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
          {currentPersonality.emoji}
        </div>
        <div>
          <h3 className="font-semibold leading-tight">{currentPersonality.name}</h3>
          <p className="text-xs text-muted-foreground">{currentPersonality.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* file input, Export, Import, Clear, Settings dialog (unchanged) */}
      </div>
    </div>

    {/* Messages — scrollable middle */}
    <ScrollArea className="flex-1 min-h-0 pr-4" ref={scrollAreaRef}>
      <div className="space-y-4 pb-4">
        {messages.map(...)}
        {isLoading && (...)}
      </div>
    </ScrollArea>

    {/* Input — pinned bottom */}
    <div className="flex-shrink-0 pt-3 mt-2 border-t">
      <div className="flex gap-2">
        <Input ... />
        <Button ...><Send /></Button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 text-center">
        Stored privately on this device.
      </p>
    </div>
  </div>
}
```

Key changes vs. current:
- Add `flex flex-col h-full` (already there) but make scroll `flex-1 min-h-0` so it actually takes the remaining space inside the parent flex column.
- Add `flex-shrink-0` to the header and footer so they don't get squeezed by the scroll area.
- Dialog auto-shrinks to its content; the inner scroll area must be `min-h-0` to inherit the parent's constrained height (Radix `DialogContent` sets a fixed viewport height).

### 3. Wire personalities into the full-page SmartBuddy

In [SmartBuddy.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/SmartBuddy.tsx):

- Import `PERSONALITIES`, `getPersonality`, `PERSONALITY_STORAGE_KEY` from the new lib.
- Initialize `personality` state from `localStorage.getItem(PERSONALITY_STORAGE_KEY) ?? "default"`.
- Persist on change with `useEffect`.
- Use the persona's `greeting` for the initial assistant message (instead of the hard-coded string on line 36).
- Add a small persona selector dropdown in the page header (using the same `Select` shadcn component the widget uses) next to the existing action icons.
- Pass `personality` into `send()` options as `{ personality, onError }`.

### 4. Settings dialog — show a real persona picker

The widget's `Settings` Dialog currently shows a single `<Select>` with the emoji + name. That works, but for the new design it should also show the description for each option, so users can pick the right one. Because the shadcn `SelectItem` doesn't natively render multi-line content with descriptions, we'll use a simple `<RadioGroup>` inside the dialog body (one radio per persona showing emoji, name, description). This is consistent with the rest of the dashboard's settings dialogs (e.g. notification preferences).

Changes:

- Replace the single `<Select>` in the settings dialog with a `<RadioGroup>` whose items are `<div>` rows: emoji + name + description.
- The radio's value is the persona id.

### 5. Collapsed-view personality indicator

The collapsed card already shows the persona emoji, name, description. No change required, but ensure it picks up the new `getPersonality` helper so a stale `localStorage` value (e.g. from a previous build with old persona ids) falls back gracefully.

### 6. Cleanup

- `SmartBuddyWidget.tsx` — remove the dead comment `// ... (Keep other personalities if needed, simplified for brevity)`.
- Both files — add the `useSmartBuddyChat` super-typing if missing; no new deps.

## Assumptions & Decisions

- **No backend changes.** The 7 personas already exist in `personalityPrompts`. We mirror them on the frontend.
- **Single shared source of truth.** The new `lib/smartBuddyPersonalities.ts` is consumed by both the widget and the page so the dropdown stays in sync.
- **No telemetry schema change.** The `smartbuddy_usage.personality` column already accepts any string; no migration needed.
- **Storage key unchanged.** `smartbuddy-personality` so existing user preferences survive the upgrade.
- **Settings dialog stays a `Dialog` (not a Popover).** It already exists; minor change to swap `<Select>` for `<RadioGroup>`.
- **No dependency additions.** `RadioGroup` is already in `package.json` (`@radix-ui/react-radio-group` v1.3.7).
- **Layout is purely CSS.** No new state, no new ref, no new hook.

## Files to change

| File | Change |
| --- | --- |
| `src/lib/smartBuddyPersonalities.ts` | **NEW** — central persona list + helper + storage key. |
| `src/components/widgets/SmartBuddyWidget.tsx` | Replace local `personalities` with import; restructure expanded JSX (header `flex-shrink-0`, scroll `flex-1 min-h-0`, footer `flex-shrink-0`); swap settings `Select` for `RadioGroup`; remove dead comment; persist key via helper. |
| `src/pages/SmartBuddy.tsx` | Import persona types; read/write `PERSONALITY_STORAGE_KEY`; use persona greeting for initial message; add persona `Select` next to existing action icons; pass `personality` into `send`. |

## Verification

1. **Type & lint**
   - `npx tsc --noEmit` → exit 0
   - `npm run lint` → 0 errors (existing 11 react-refresh warnings only)
2. **Build**
   - `npm run build` → exit 0
3. **Runtime smoke (Playwright MCP)**
   - Open `/dashboard` → expand Smart Buddy widget.
   - Verify persona header (avatar + name + description) sits at the top of the dialog, scroll area fills the middle, input bar is pinned at the bottom.
   - Send a message → bubbles flow, auto-scroll works, header stays fixed.
   - Open Settings dialog → all 7 personas listed with emoji + description; switching updates the dialog header immediately.
   - Refresh page → selection persists.
   - Open `/smartbuddy` (full page) → persona selector present in header; initial greeting matches the selected persona; selection persists across reloads.
   - Switch persona on the page → closed widget shows the same persona after refresh.
4. **Regression**
   - localStorage values for `smartbuddy-personality` from a legacy build still resolve (fall back to default).
   - Existing exported chat backups still parse (no message shape change).
5. **Append to `.trae/agent-log.md`** with the change entry, MCP invocations table, and verification results.

## Out of scope

- Visual redesign of the widget's collapsed card (only the expanded view is changed).
- Streaming, tooltips, persona preview/try-on, persona-specific starter prompts.
- Backend telemetry enrichment (e.g. persona display name in `smartbuddy_usage`).
- Hide-the-settings-popover-behind-portal fixes (already working).
