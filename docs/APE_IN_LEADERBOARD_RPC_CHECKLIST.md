# Ape In Leaderboard RPC – “Do this now” checklist

Use this when the SQL editor returns rows for `get_ape_in_leaderboard` but the browser still gets `[]`.

---

## 1. Confirm the RPC returns rows from SQL

```sql
select * from public.get_ape_in_leaderboard('aida', 100);
```

If this returns your row, the DB function is correct.

---

## 2. Force PostgREST to see the new function

- **Supabase Dashboard → Settings → API → Reload schema**
- Wait 10–20 seconds.
- Hard refresh the site (Ctrl+Shift+R / Cmd+Shift+R).

---

## 3. Check whether PostgREST or the app is wrong

- **DevTools → Network** → select the `rpc/get_ape_in_leaderboard` request.

**Request Payload** must be:

```json
{"p_mode":"aida","p_limit":100}
```

**Response:**

- `[ { ... } ]` → fixed; UI should show data with the current mapping.
- `[]` → REST path is filtering everything out; continue with step 4.

---

## 4. If PostgREST still returns `[]` – season isolation test

The live function may be using a `current_season` subquery that returns a different value in the REST context.

**4a. Inspect the deployed function**

```sql
select pg_get_functiondef('public.get_ape_in_leaderboard(text,integer)'::regprocedure) as def;
```

- If the body is basically `RETURN;` or a stub, the stub is still deployed. Replace it with the real implementation.
- If you see the full implementation, continue to 4b.

**4b. Temporarily use a “hard season” version**

Run the isolation script (adjust if your schema differs):

```bash
# In Supabase SQL Editor, run:
# scripts/get_ape_in_leaderboard_hard_season.sql
```

That script defines `get_ape_in_leaderboard` with `season = 1` and reads from `ape_in_leaderboard` (and `best_ended_at`). If your project uses `leaderboard.ape_in_high_score` instead of `ape_in_leaderboard`, edit the script to match your schema.

Then:

- **Reload schema** again (Settings → API → Reload schema).
- Re-test the browser RPC call.

- If it returns your row → the issue is the `current_season` logic in the original function.
- Long‑term: make season explicit, e.g. `get_ape_in_leaderboard(p_mode, p_season, p_limit)` and have the app pass `CURRENT_SEASON`.

---

## 5. Confirm Ape In uses the RPC, not the old leaderboard

All Ape In leaderboard reads should go through `LeaderboardService.getApeInLeaderboard()` → `get_ape_in_leaderboard` RPC.

| Place | Source | Status |
|-------|--------|--------|
| **Leaderboard page** (Ape In tabs) | `LeaderboardService.getApeInLeaderboard(mode, 100)` | ✅ |
| **Arcade Hub** (Ape In “Ranked” widget) | `LeaderboardService.getApeInLeaderboard("best", 5)` | ✅ |

Nothing in the app reads `leaderboard.ape_in_high_score` or the old `leaderboard` Ape In columns for UI.  
`lib/apein-store.ts` has a KV-based `getApeInLeaderboard` but it is not imported or used by the Ape In UI.

---

## If it’s still empty

Capture and share:

1. The **Response body** of the `rpc/get_ape_in_leaderboard` request.
2. The **Request Payload** from DevTools.

That is enough to see whether the problem is: wrong project/key, stub function, season filtering, or UI/state.
