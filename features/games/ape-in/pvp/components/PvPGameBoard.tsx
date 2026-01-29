"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"

type PvPPhase =
  | "WAITING_FOR_OPPONENT"
  | "FIRST_ROLL_REVEAL"
  | "DRAW"
  | "ROLL"
  | "DECISION"
  | "GAME_END"

interface PvPGameStateV1 {
  state_version: 1
  turn_number: number
  phase: PvPPhase
  round_number: number
  seat_map: { seat1: string; seat2: string } // user_ids
  current_turn_seat: "seat1" | "seat2"
  scores: {
    seat1_total: number
    seat2_total: number
    seat1_turn: number
    seat2_turn: number
  }
  last_draw?: { card_id: string; label: string; created_at: string } | null
  last_roll?: { value: number; created_at: string } | null
  last_action:
    | {
        type: "draw" | "roll" | "stack" | "forfeit"
        by_user_id: string
        created_at: string
        details?: any
      }
    | null
}

interface MatchStateResponse {
  requester_user_id: string
  match_status: string
  winner_id?: string | null
  forfeited_by?: string | null
  game_state?: PvPGameStateV1 | any
}

export default function PvPGameBoard({
  matchId,
  playerAddress,
  onClose,
}: {
  matchId: string
  playerAddress: string | null
  onClose: () => void
}) {
  const [data, setData] = useState<MatchStateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)
  const lastTurnNumberRef = useRef<number>(-1)

  const gameState: PvPGameStateV1 | null = useMemo(() => {
    const gs = data?.game_state
    if (!gs || gs.state_version !== 1) return null
    return gs as PvPGameStateV1
  }, [data])

  const mySeat = useMemo<"seat1" | "seat2" | null>(() => {
    if (!gameState || !data?.requester_user_id) return null
    if (gameState.seat_map?.seat1 === data.requester_user_id) return "seat1"
    if (gameState.seat_map?.seat2 === data.requester_user_id) return "seat2"
    return null
  }, [gameState, data?.requester_user_id])

  const isMyTurn = !!(gameState && mySeat && gameState.current_turn_seat === mySeat)

  const applyIfFresh = useCallback((next: MatchStateResponse) => {
    const nextTurn = (next.game_state?.turn_number ?? -1) as number
    if (nextTurn <= lastTurnNumberRef.current) return
    lastTurnNumberRef.current = nextTurn
    setData(next)
  }, [])

  const fetchState = useCallback(async () => {
    if (!playerAddress) return
    const res = await fetch(`/api/ape-in/pvp/match/${matchId}?playerAddress=${playerAddress}`)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.error || "Failed to fetch match state")
    }
    const j = (await res.json()) as MatchStateResponse
    applyIfFresh(j)
  }, [applyIfFresh, matchId, playerAddress])

  useEffect(() => {
    let mounted = true
    setError(null)
    lastTurnNumberRef.current = -1
    setData(null)

    const run = async () => {
      try {
        await fetchState()
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to fetch state")
      }
    }

    run()
    const t = setInterval(() => {
      run()
    }, 1200)
    return () => {
      mounted = false
      clearInterval(t)
    }
  }, [fetchState])

  const callAction = useCallback(
    async (action: "draw" | "roll" | "stack" | "forfeit") => {
      if (!playerAddress) return
      setIsActing(true)
      setError(null)
      try {
        const res = await fetch(`/api/ape-in/pvp/match/${matchId}/action/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerAddress }),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(j.error || `Failed to ${action}`)
        }
        applyIfFresh({
          requester_user_id: data?.requester_user_id || "",
          match_status: j.match_status,
          winner_id: j.winner_id,
          forfeited_by: j.forfeited_by,
          game_state: j.game_state,
        })
      } catch (e: any) {
        setError(e?.message || `Failed to ${action}`)
      } finally {
        setIsActing(false)
      }
    },
    [applyIfFresh, data?.requester_user_id, matchId, playerAddress]
  )

  const canDraw = !!(gameState && isMyTurn && (gameState.phase === "DRAW" || gameState.phase === "DECISION"))
  const canRoll = !!(gameState && isMyTurn && gameState.phase === "ROLL")
  const canStack = !!(gameState && isMyTurn && gameState.phase === "DECISION")
  const canForfeit = !!(gameState && data?.match_status === "in_progress")

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700 p-6 md:p-8 rounded-2xl w-full max-w-xl shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-white font-bold text-xl">Ape In PvP</div>
            <div className="text-slate-400 text-sm font-mono">match: {matchId.slice(0, 8)}…</div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/40 text-slate-200 hover:bg-slate-700/40"
          >
            Close
          </button>
        </div>

        {error && <div className="mb-3 text-red-300 text-sm">{error}</div>}

        {!gameState ? (
          <div className="text-slate-300">Loading game state…</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="text-slate-400 text-xs mb-1">Round / Turn</div>
                <div className="text-white font-mono">
                  r{gameState.round_number} · t{gameState.turn_number}
                </div>
                <div className="text-slate-400 text-xs mt-2">Phase</div>
                <div className="text-white font-mono">{gameState.phase}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="text-slate-400 text-xs mb-1">Turn</div>
                <div className="text-white font-mono">
                  {gameState.current_turn_seat} {isMyTurn ? "(you)" : ""}
                </div>
                <div className="text-slate-400 text-xs mt-2">You</div>
                <div className="text-white font-mono">{mySeat ?? "—"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl border p-4 ${mySeat === "seat1" ? "border-purple-500/50" : "border-slate-800"} bg-slate-900/40`}>
                <div className="text-slate-400 text-xs mb-1">Seat1</div>
                <div className="text-white font-mono">
                  total {gameState.scores.seat1_total} · turn {gameState.scores.seat1_turn}
                </div>
              </div>
              <div className={`rounded-xl border p-4 ${mySeat === "seat2" ? "border-cyan-500/50" : "border-slate-800"} bg-slate-900/40`}>
                <div className="text-slate-400 text-xs mb-1">Seat2</div>
                <div className="text-white font-mono">
                  total {gameState.scores.seat2_total} · turn {gameState.scores.seat2_turn}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-slate-400 text-xs mb-2">Last</div>
              <div className="text-white text-sm">
                {gameState.last_draw?.label ? `Draw: ${gameState.last_draw.label}` : "Draw: —"}{" "}
                {gameState.last_roll?.value ? `· Roll: ${gameState.last_roll.value}` : "· Roll: —"}
              </div>
              <div className="text-slate-400 text-xs mt-1 font-mono">
                {gameState.last_action ? `${gameState.last_action.type} by ${gameState.last_action.by_user_id.slice(0, 8)}…` : "—"}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                disabled={!canDraw || isActing}
                onClick={() => callAction("draw")}
                className="px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold"
              >
                Draw
              </button>
              <button
                disabled={!canRoll || isActing}
                onClick={() => callAction("roll")}
                className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold"
              >
                Roll
              </button>
              <button
                disabled={!canStack || isActing}
                onClick={() => callAction("stack")}
                className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold"
              >
                Stack
              </button>
              <button
                disabled={!canForfeit || isActing}
                onClick={() => callAction("forfeit")}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold"
              >
                Forfeit
              </button>
            </div>

            {data?.match_status !== "in_progress" && (
              <div className="text-slate-200">
                Match ended: <span className="font-mono">{data?.match_status}</span>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

