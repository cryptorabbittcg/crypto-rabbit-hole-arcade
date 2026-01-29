export type PvPCardKind = "BEAR_MINUS_10" | "BULL_PLUS_5" | "BULL_PLUS_10" | "BULL_PLUS_20"

export type PvPCard = {
  kind: PvPCardKind
  label: string
  value: number
}

export const PVP_V1_DECK: Record<PvPCardKind, PvPCard> = {
  BEAR_MINUS_10: { kind: "BEAR_MINUS_10", label: "Bearish (-10)", value: -10 },
  BULL_PLUS_5: { kind: "BULL_PLUS_5", label: "Bullish (+5)", value: 5 },
  BULL_PLUS_10: { kind: "BULL_PLUS_10", label: "Bullish (+10)", value: 10 },
  BULL_PLUS_20: { kind: "BULL_PLUS_20", label: "Bullish (+20)", value: 20 },
}

