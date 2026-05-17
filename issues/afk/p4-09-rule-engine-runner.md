# P4-09 — Rule engine runner

## Goal
The runtime piece: subscribes to the `ZigbeeAdapter`'s event stream, finds every *active* automation whose trigger matches, evaluates its conditions, and executes its actions sequentially. This is what makes "switch turns ON → lamp turns ON" actually happen at runtime.

## Acceptance criteria
- `src/rules/runner.ts` exports `attachRuleEngine(deps): RuleEngine`:
  - `deps = { adapter: ZigbeeAdapter; db: Database; logger? }`.
  - Subscribes to `adapter.onEvent`. For each event:
    1. Loads every automation in state `active` from the DB.
    2. For each, parses its `source_yaml`; if parse fails, log + skip.
    3. If `triggerMatches(doc.trigger, event)` is false, skip.
    4. Evaluates conditions (use existing `domain/devices.get` to read state where needed — for `device_state`, fall back to *not matching* if we don't have a recent state cache yet; for `time_window` and `day_of_week`, use Date.now()).
    5. Executes actions sequentially. Records run history (p4-11 will wire this).
  - `RuleEngine.detach()` unsubscribes.
- Conditions module `src/rules/conditions.ts` with `conditionsMatch(conditions, now, deviceStateGetter): boolean`. `deviceStateGetter` is `(ieeeAddress, property) => unknown` — for v1 the cache is empty (returns undefined → device_state never matches). Time-window and day-of-week work with `now` and the local timezone (process default).
- `src/index.ts` wires `attachRuleEngine` after the bridge.
- Concurrency: serialise per-automation execution (don't fire the same automation twice concurrently — guard with a Map of in-flight promises keyed by automation id).
- Tests:
  - Mock adapter, create a draft + activate, fire simulateMessage → action dispatched (check command log).
  - Disabled automation does NOT fire.
  - Two automations both matching the same event both fire.
  - Conditions that don't match block execution.
  - Concurrent firings of the same automation are serialised (use a hand-rolled mock that sleeps briefly).

## Notes
- Real state caching (so `device_state` conditions can work) is a follow-up. For this issue the engine wires the plumbing — conditions just don't match for `device_state` until we have a cache.
- The runner is a long-lived subscriber; on app shutdown, `detach()` is called from `src/index.ts` alongside the bridge.
