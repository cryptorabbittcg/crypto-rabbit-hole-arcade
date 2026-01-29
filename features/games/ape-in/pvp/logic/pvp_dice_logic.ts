export type PvPDiceRoll = 1 | 2 | 3 | 4 | 5 | 6

export function isBust(roll: PvPDiceRoll): boolean {
  return roll === 1
}

export function isEven(roll: PvPDiceRoll): boolean {
  return roll % 2 === 0
}

