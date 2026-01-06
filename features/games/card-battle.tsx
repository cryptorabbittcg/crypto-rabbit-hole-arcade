"use client"

import { useState, useEffect } from "react"
import { useArcade } from "@/components/providers"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Zap, Heart, Shield, Swords } from "@/components/icons"

type BattleCard = {
  id: string
  name: string
  image: string
  attack: number
  defense: number
  health: number
  rarity: "common" | "rare" | "epic" | "legendary"
}

type DamageNumber = {
  id: string
  damage: number
  x: number
  y: number
  isPlayer: boolean
}

type Upgrade = {
  id: string
  name: string
  type: "badge" | "border" | "shield" | "booster" | "disruptor" | "killshot"
  cost: number
  effect: {
    attack?: number
    defense?: number
    health?: number
    special?: string
  }
  icon: string
  description: string
}

export default function CardBattle() {
  const { cards, addPoints, addTickets, points, addCard } = useArcade()
  const [playerCard, setPlayerCard] = useState<BattleCard | null>(null)
  const [opponentCard, setOpponentCard] = useState<BattleCard | null>(null)
  const [playerHealth, setPlayerHealth] = useState(100)
  const [opponentHealth, setOpponentHealth] = useState(100)
  const [battleLog, setBattleLog] = useState<string[]>([])
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null)
  const [playerAttacking, setPlayerAttacking] = useState(false)
  const [opponentAttacking, setOpponentAttacking] = useState(false)
  const [playerHit, setPlayerHit] = useState(false)
  const [opponentHit, setOpponentHit] = useState(false)
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([])
  const [showVictory, setShowVictory] = useState(false)

  const [showUpgradeShop, setShowUpgradeShop] = useState(false)
  const [activeUpgrades, setActiveUpgrades] = useState<Upgrade[]>([])
  const [playTime, setPlayTime] = useState(0)
  const [hasKillShot, setHasKillShot] = useState(false)

  const [upgradeInventory, setUpgradeInventory] = useState<Upgrade[]>([])
  const [showInventory, setShowInventory] = useState(false)

  const availableUpgrades: Upgrade[] = [
    {
      id: "attack-boost",
      name: "Attack Booster",
      type: "booster",
      cost: 50,
      effect: { attack: 15 },
      icon: "⚔️",
      description: "+15 Attack for this battle",
    },
    {
      id: "defense-shield",
      name: "Defense Shield",
      type: "shield",
      cost: 40,
      effect: { defense: 10 },
      icon: "🛡️",
      description: "+10 Defense for this battle",
    },
    {
      id: "health-badge",
      name: "Health Badge",
      type: "badge",
      cost: 60,
      effect: { health: 25 },
      icon: "❤️",
      description: "+25 Health instantly",
    },
    {
      id: "market-disruptor",
      name: "Market Disruptor",
      type: "disruptor",
      cost: 80,
      effect: { attack: 10, defense: 5, special: "Reduces opponent defense by 5" },
      icon: "💥",
      description: "Disrupts opponent's strategy",
    },
    {
      id: "golden-border",
      name: "Golden Border",
      type: "border",
      cost: 100,
      effect: { attack: 20, defense: 15 },
      icon: "✨",
      description: "Legendary power boost",
    },
    {
      id: "kill-shot",
      name: "Kill Shot",
      type: "killshot",
      cost: 150,
      effect: { special: "Instant 50 damage" },
      icon: "💀",
      description: "One-time devastating attack",
    },
  ]

  const applyUpgradeFromInventory = (upgrade: Upgrade) => {
    console.log("[v0] Applying upgrade from inventory:", upgrade.name)

    setUpgradeInventory((prev) => {
      const updated = prev.filter((u) => u.id !== upgrade.id)
      console.log("[v0] Inventory after removal:", updated.length, "items")
      return updated
    })

    setActiveUpgrades((prev) => [...prev, upgrade])

    if (upgrade.effect.attack && playerCard) {
      setPlayerCard({ ...playerCard, attack: playerCard.attack + upgrade.effect.attack })
      console.log("[v0] Applied attack boost:", upgrade.effect.attack)
    }
    if (upgrade.effect.defense && playerCard) {
      setPlayerCard({ ...playerCard, defense: playerCard.defense + upgrade.effect.defense })
      console.log("[v0] Applied defense boost:", upgrade.effect.defense)
    }
    if (upgrade.effect.health) {
      setPlayerHealth((prev) => {
        const newHealth = Math.min(prev + upgrade.effect.health, 100)
        console.log("[v0] Applied health boost:", upgrade.effect.health, "New health:", newHealth)
        return newHealth
      })
    }
    if (upgrade.type === "killshot") {
      setHasKillShot(true)
      console.log("[v0] Kill shot activated!")
    }
    if (upgrade.type === "disruptor" && opponentCard) {
      setOpponentCard({ ...opponentCard, defense: Math.max(opponentCard.defense - 5, 0) })
      console.log("[v0] Market disruptor applied - reduced opponent defense")
    }

    setBattleLog((prev) => [...prev, `✅ Used ${upgrade.name}!`])
    setShowInventory(false)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setPlayTime((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const cardNumbers = Array.from({ length: 64 }, (_, i) => i + 1)
    const randomPlayerCard = cardNumbers[Math.floor(Math.random() * cardNumbers.length)]
    const randomOpponentCard = cardNumbers[Math.floor(Math.random() * cardNumbers.length)]

    setPlayerCard(generateBattleCard(randomPlayerCard))
    setOpponentCard(generateBattleCard(randomOpponentCard))
  }, [])

  const generateBattleCard = (cardNumber: number): BattleCard => {
    const rarities: BattleCard["rarity"][] = ["common", "rare", "epic", "legendary"]
    const rarity = rarities[Math.floor(Math.random() * rarities.length)]

    return {
      id: `card-${cardNumber}`,
      name: `Card #${cardNumber}`,
      image: `/cards/${String(cardNumber).padStart(2, "0")}.png`,
      attack: Math.floor(Math.random() * 50) + 20,
      defense: Math.floor(Math.random() * 30) + 10,
      health: 100,
      rarity,
    }
  }

  const showDamage = (damage: number, isPlayer: boolean) => {
    const id = `damage-${Date.now()}-${Math.random()}`
    const newDamage: DamageNumber = {
      id,
      damage,
      x: Math.random() * 100 - 50,
      y: 0,
      isPlayer,
    }
    setDamageNumbers((prev) => [...prev, newDamage])

    setTimeout(() => {
      setDamageNumbers((prev) => prev.filter((d) => d.id !== id))
    }, 1500)
  }

  const purchaseUpgrade = (upgrade: Upgrade) => {
    if (points < upgrade.cost) {
      setBattleLog((prev) => [...prev, `Not enough points! Need ${upgrade.cost} APE`])
      return
    }

    addPoints(-upgrade.cost)
    setUpgradeInventory((prev) => [...prev, upgrade])

    addCard({
      id: upgrade.id,
      name: upgrade.name,
      image: upgrade.icon,
      rarity: "rare",
      power: upgrade.cost,
    })

    setBattleLog((prev) => [...prev, `Purchased ${upgrade.name}! Check inventory to use it.`])
    setShowUpgradeShop(false)
  }

  const useKillShot = () => {
    if (!hasKillShot || gameOver) return

    setPlayerAttacking(true)
    setTimeout(() => setPlayerAttacking(false), 600)

    setTimeout(() => {
      const damage = 50
      const newOpponentHealth = Math.max(opponentHealth - damage, 0)

      setOpponentHit(true)
      showDamage(damage, false)
      setTimeout(() => setOpponentHit(false), 500)

      setOpponentHealth(newOpponentHealth)
      setBattleLog((prev) => [...prev, `💀 KILL SHOT! Dealt ${damage} damage!`])
      setHasKillShot(false)

      if (newOpponentHealth <= 0) {
        setTimeout(() => endGame("player"), 800)
        return
      }

      setIsPlayerTurn(false)
      const aiDelay = Math.random() * 1000 + 1500
      setTimeout(opponentAttack, aiDelay)
    }, 400)
  }

  const attack = () => {
    if (!playerCard || !opponentCard || gameOver) return

    setPlayerAttacking(true)
    setTimeout(() => setPlayerAttacking(false), 600)

    setTimeout(() => {
      const damage = Math.max(playerCard.attack - opponentCard.defense, 5)
      const newOpponentHealth = Math.max(opponentHealth - damage, 0)

      setOpponentHit(true)
      showDamage(damage, false)
      setTimeout(() => setOpponentHit(false), 500)

      setOpponentHealth(newOpponentHealth)
      setBattleLog((prev) => [...prev, `You dealt ${damage} damage!`])

      if (newOpponentHealth <= 0) {
        setTimeout(() => endGame("player"), 800)
        return
      }

      setIsPlayerTurn(false)
      const aiDelay = Math.random() * 1000 + 1500
      setTimeout(opponentAttack, aiDelay)
    }, 400)
  }

  const opponentAttack = () => {
    if (!playerCard || !opponentCard || gameOver) return

    setOpponentAttacking(true)
    setTimeout(() => setOpponentAttacking(false), 600)

    setTimeout(() => {
      const damage = Math.max(opponentCard.attack - playerCard.defense, 5)
      const newPlayerHealth = Math.max(playerHealth - damage, 0)

      setPlayerHit(true)
      showDamage(damage, true)
      setTimeout(() => setPlayerHit(false), 500)

      setPlayerHealth(newPlayerHealth)
      setBattleLog((prev) => [...prev, `Opponent dealt ${damage} damage!`])

      if (newPlayerHealth <= 0) {
        setTimeout(() => endGame("opponent"), 800)
        return
      }

      setIsPlayerTurn(true)
    }, 400)
  }

  const endGame = (gameWinner: "player" | "opponent") => {
    setGameOver(true)
    setWinner(gameWinner)
    setShowVictory(true)

    if (gameWinner === "player") {
      const pointsEarned = 100
      const ticketsEarned = 2
      addPoints(pointsEarned)
      addTickets(ticketsEarned)
      setBattleLog((prev) => [...prev, `Victory! Earned ${pointsEarned} points and ${ticketsEarned} tickets!`])
    } else {
      setBattleLog((prev) => [...prev, "Defeat! Better luck next time."])
    }
  }

  const resetGame = () => {
    const cardNumbers = Array.from({ length: 64 }, (_, i) => i + 1)
    const randomPlayerCard = cardNumbers[Math.floor(Math.random() * cardNumbers.length)]
    const randomOpponentCard = cardNumbers[Math.floor(Math.random() * cardNumbers.length)]

    setPlayerCard(generateBattleCard(randomPlayerCard))
    setOpponentCard(generateBattleCard(randomOpponentCard))
    setPlayerHealth(100)
    setOpponentHealth(100)
    setBattleLog([])
    setIsPlayerTurn(true)
    setGameOver(false)
    setWinner(null)
    setShowVictory(false)
    setDamageNumbers([])
    setActiveUpgrades([])
    setHasKillShot(false)
    setUpgradeInventory([])
  }

  const getRarityColor = (rarity: BattleCard["rarity"]) => {
    switch (rarity) {
      case "legendary":
        return "border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)]"
      case "epic":
        return "border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.5)]"
      case "rare":
        return "border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.5)]"
      default:
        return "border-gray-500 shadow-[0_0_20px_rgba(107,114,128,0.3)]"
    }
  }

  if (!playerCard || !opponentCard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl font-bold animate-pulse">Loading battle...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-3 md:p-6 max-w-7xl">
      <style jsx>{`
        @keyframes cardEntrance {
          from {
            opacity: 0;
            transform: translateY(50px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes attackSlide {
          0% {
            transform: translateX(0) scale(1);
          }
          50% {
            transform: translateX(30px) scale(1.1);
          }
          100% {
            transform: translateX(0) scale(1);
          }
        }

        @keyframes attackSlideLeft {
          0% {
            transform: translateX(0) scale(1);
          }
          50% {
            transform: translateX(-30px) scale(1.1);
          }
          100% {
            transform: translateX(0) scale(1);
          }
        }

        @keyframes hitShake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }

        @keyframes damageFloat {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(1.5);
          }
        }

        @keyframes victoryPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .card-entrance {
          animation: cardEntrance 0.6s ease-out;
        }

        .attacking {
          animation: attackSlide 0.6s ease-in-out;
        }

        .attacking-left {
          animation: attackSlideLeft 0.6s ease-in-out;
        }

        .hit {
          animation: hitShake 0.5s ease-in-out;
        }

        .damage-number {
          animation: damageFloat 1.5s ease-out forwards;
          position: absolute;
          font-size: 2rem;
          font-weight: bold;
          pointer-events: none;
          z-index: 50;
        }

        .victory-animation {
          animation: victoryPulse 1s ease-in-out infinite;
        }
      `}</style>

      <div className="text-center mb-3 md:mb-8">
        <h1 className="font-display text-2xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent mb-1 md:mb-2">
          CARD BATTLE ARENA
        </h1>
        <p className="text-xs md:text-base text-muted-foreground mb-2">A fun card battler using cards from The Crypto Rabbit Hole TCG universe</p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            AI Opponent
          </Badge>
          <Badge variant="secondary" className="text-xs">
            ⏱️ {Math.floor(playTime / 60)}:{(playTime % 60).toString().padStart(2, "0")}
          </Badge>
          {activeUpgrades.length > 0 && (
            <Badge variant="default" className="text-xs">
              ⚡ {activeUpgrades.length} Active
            </Badge>
          )}
          {upgradeInventory.length > 0 && (
            <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setShowInventory(true)}>
              🎒 {upgradeInventory.length} Items
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-4 mb-3 md:mb-6">
        {/* Player Card */}
        <div
          className={`space-y-1 md:space-y-2 card-entrance ${playerAttacking ? "attacking" : ""} ${playerHit ? "hit" : ""}`}
        >
          <div className="flex items-center justify-between bg-black/30 rounded-lg p-1 md:p-2">
            <Badge variant="secondary" className="text-[10px] md:text-xs px-1 md:px-2">
              YOUR CARD
            </Badge>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
              <span className="text-sm md:text-xl font-bold text-red-500">{playerHealth}</span>
            </div>
          </div>
          <div className="w-full h-1 md:h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-500"
              style={{ width: `${playerHealth}%` }}
            />
          </div>

          <div className="relative">
            <Card
              className={`p-0.5 md:p-2 bg-black/50 border md:border-2 ${
                activeUpgrades.find((u) => u.type === "border")
                  ? "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                  : getRarityColor(playerCard.rarity)
              } transition-all duration-300`}
            >
              <img
                src={playerCard.image || "/placeholder.svg"}
                alt={playerCard.name}
                className="w-[34%] mx-auto aspect-[2/3] object-cover rounded-lg mb-0.5 md:mb-1"
              />
              <div className="grid grid-cols-2 gap-0.5 md:gap-1 text-[10px] md:text-xs">
                <div className="flex items-center justify-between bg-red-500/10 rounded px-1 md:px-2 py-0.5">
                  <span className="flex items-center gap-0.5">
                    <Swords className="w-2 h-2 md:w-3 md:h-3 text-red-500" />
                    <span className="text-[8px] md:text-[10px]">ATK</span>
                  </span>
                  <span className="font-bold text-red-500 text-[10px] md:text-xs">{playerCard.attack}</span>
                </div>
                <div className="flex items-center justify-between bg-blue-500/10 rounded px-1 md:px-2 py-0.5">
                  <span className="flex items-center gap-0.5">
                    <Shield className="w-2 h-2 md:w-3 md:h-3 text-blue-500" />
                    <span className="text-[8px] md:text-[10px]">DEF</span>
                  </span>
                  <span className="font-bold text-blue-500 text-[10px] md:text-xs">{playerCard.defense}</span>
                </div>
              </div>
              {activeUpgrades.length > 0 && (
                <div className="flex gap-0.5 md:gap-1 mt-0.5 md:mt-1 flex-wrap">
                  {activeUpgrades.map((upgrade) => (
                    <Badge key={upgrade.id} variant="outline" className="text-[8px] md:text-[10px] px-0.5">
                      {upgrade.icon}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
            {damageNumbers
              .filter((d) => d.isPlayer)
              .map((d) => (
                <div
                  key={d.id}
                  className="damage-number text-red-500"
                  style={{
                    left: `calc(50% + ${d.x}px)`,
                    top: "50%",
                  }}
                >
                  -{d.damage}
                </div>
              ))}
          </div>

          {!gameOver && isPlayerTurn && (
            <div className="grid grid-cols-2 gap-1">
              <Button onClick={attack} className="w-full text-[10px] md:text-xs h-7 md:h-8" size="sm">
                <Zap className="w-2 h-2 md:w-3 md:h-3 mr-0.5" />
                <span className="hidden md:inline">ATTACK</span>
                <span className="md:hidden">ATK</span>
              </Button>
              <Button
                onClick={() => setShowUpgradeShop(true)}
                variant="outline"
                className="w-full text-[10px] md:text-xs h-7 md:h-8"
                size="sm"
              >
                <span className="hidden md:inline">🛒 SHOP</span>
                <span className="md:hidden">🛒</span>
              </Button>
              {hasKillShot && (
                <Button
                  onClick={useKillShot}
                  variant="destructive"
                  className="w-full col-span-2 animate-pulse text-[10px] md:text-xs h-7 md:h-8"
                  size="sm"
                >
                  💀 KILL SHOT
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Opponent Card */}
        <div
          className={`space-y-1 md:space-y-2 card-entrance ${opponentAttacking ? "attacking-left" : ""} ${opponentHit ? "hit" : ""}`}
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-center justify-between bg-black/30 rounded-lg p-1 md:p-2">
            <Badge variant="destructive" className="text-[10px] md:text-xs px-1 md:px-2">
              OPPONENT
            </Badge>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
              <span className="text-sm md:text-xl font-bold text-red-500">{opponentHealth}</span>
            </div>
          </div>
          <div className="w-full h-1 md:h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${opponentHealth}%` }}
            />
          </div>

          <div className="relative">
            <Card
              className={`p-0.5 md:p-2 bg-black/50 border md:border-2 ${getRarityColor(opponentCard.rarity)} transition-all duration-300`}
            >
              <img
                src={opponentCard.image || "/placeholder.svg"}
                alt={opponentCard.name}
                className="w-[34%] mx-auto aspect-[2/3] object-cover rounded-lg mb-0.5 md:mb-1"
              />
              <div className="grid grid-cols-2 gap-0.5 md:gap-1 text-[10px] md:text-xs">
                <div className="flex items-center justify-between bg-red-500/10 rounded px-1 md:px-2 py-0.5">
                  <span className="flex items-center gap-0.5">
                    <Swords className="w-2 h-2 md:w-3 md:h-3 text-red-500" />
                    <span className="text-[8px] md:text-[10px]">ATK</span>
                  </span>
                  <span className="font-bold text-red-500 text-[10px] md:text-xs">{opponentCard.attack}</span>
                </div>
                <div className="flex items-center justify-between bg-blue-500/10 rounded px-1 md:px-2 py-0.5">
                  <span className="flex items-center gap-0.5">
                    <Shield className="w-2 h-2 md:w-3 md:h-3 text-blue-500" />
                    <span className="text-[8px] md:text-[10px]">DEF</span>
                  </span>
                  <span className="font-bold text-blue-500 text-[10px] md:text-xs">{opponentCard.defense}</span>
                </div>
              </div>
            </Card>
            {damageNumbers
              .filter((d) => !d.isPlayer)
              .map((d) => (
                <div
                  key={d.id}
                  className="damage-number text-red-500"
                  style={{
                    left: `calc(50% + ${d.x}px)`,
                    top: "50%",
                  }}
                >
                  -{d.damage}
                </div>
              ))}
          </div>

          {!gameOver && !isPlayerTurn && (
            <div className="w-full p-1 md:p-2 text-center bg-muted/20 rounded-lg animate-pulse">
              <div className="text-[10px] md:text-sm font-bold">AI Thinking...</div>
            </div>
          )}
        </div>
      </div>

      <Card className="p-2 md:p-4 bg-black/50 border-2 border-primary/30">
        <h3 className="font-display text-xs md:text-lg font-bold mb-1 md:mb-2">Battle Log</h3>
        <div className="space-y-0.5 max-h-16 md:max-h-32 overflow-y-auto">
          {battleLog.slice(-5).map((log, index) => (
            <div
              key={index}
              className="text-[10px] md:text-xs text-muted-foreground animate-in fade-in slide-in-from-left duration-300"
            >
              {log}
            </div>
          ))}
        </div>
      </Card>

      {showUpgradeShop && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="p-4 md:p-6 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 right-0 flex justify-end mb-2 z-20 -mt-2 -mr-2">
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setShowUpgradeShop(false)}
                className="h-10 w-10 md:h-12 md:w-12 rounded-full shadow-lg"
              >
                <span className="text-2xl font-bold">✕</span>
              </Button>
            </div>

            <h2 className="font-display text-xl md:text-2xl font-bold mb-4">Upgrade Shop</h2>
            <div className="mb-4 p-3 bg-primary/10 rounded-lg">
              <div className="text-sm text-muted-foreground">Your APE Balance</div>
              <div className="text-2xl font-bold text-yellow-500">{points} APE</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {availableUpgrades.map((upgrade) => {
                const canAfford = points >= upgrade.cost
                const isUnlocked = playTime >= 30 || upgrade.type !== "killshot"

                return (
                  <Card key={upgrade.id} className={`p-3 ${!canAfford || !isUnlocked ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-2xl">{upgrade.icon}</div>
                      <Badge variant={canAfford ? "default" : "secondary"} className="text-xs">
                        {upgrade.cost} APE
                      </Badge>
                    </div>
                    <h3 className="font-bold text-sm mb-1">{upgrade.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{upgrade.description}</p>
                    {!isUnlocked && <p className="text-xs text-yellow-500 mb-2">🔒 Unlocks after 30s playtime</p>}
                    <Button
                      onClick={() => purchaseUpgrade(upgrade)}
                      disabled={!canAfford || !isUnlocked}
                      size="sm"
                      className="w-full"
                    >
                      Purchase
                    </Button>
                  </Card>
                )
              })}
            </div>
            <Button onClick={() => setShowUpgradeShop(false)} variant="outline" className="w-full" size="lg">
              Back to Battle
            </Button>
          </Card>
        </div>
      )}

      {showInventory && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="p-4 md:p-6 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 right-0 flex justify-end mb-2 z-20 -mt-2 -mr-2">
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setShowInventory(false)}
                className="h-10 w-10 md:h-12 md:w-12 rounded-full shadow-lg"
              >
                <span className="text-2xl font-bold">✕</span>
              </Button>
            </div>

            <h2 className="font-display text-xl md:text-2xl font-bold mb-4">Upgrade Inventory</h2>
            {upgradeInventory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-4">🎒</div>
                <p className="text-lg font-semibold mb-2">No upgrades in inventory</p>
                <p className="text-sm">Purchase upgrades from the shop to use them in battle</p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-400">💡 Click "Use Now" to activate upgrades during battle</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {upgradeInventory.map((upgrade) => (
                    <Card key={upgrade.id} className="p-3 border-2 border-primary/50 bg-primary/5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-3xl">{upgrade.icon}</div>
                        <Badge variant="default" className="text-xs bg-green-500">
                          ✓ Ready
                        </Badge>
                      </div>
                      <h3 className="font-bold text-base mb-1">{upgrade.name}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{upgrade.description}</p>
                      <Button
                        onClick={() => {
                          console.log("[v0] Use Now button clicked for:", upgrade.name)
                          applyUpgradeFromInventory(upgrade)
                        }}
                        size="lg"
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 font-bold"
                        disabled={gameOver}
                      >
                        {gameOver ? "Game Over" : "⚡ Use Now"}
                      </Button>
                    </Card>
                  ))}
                </div>
              </>
            )}
            <Button onClick={() => setShowInventory(false)} variant="outline" className="w-full" size="lg">
              Back to Battle
            </Button>
          </Card>
        </div>
      )}

      {showVictory && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          {winner === "player" && (
            <>
              {/* Confetti animation */}
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 md:w-3 md:h-3 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: "-10%",
                    backgroundColor: ["#ec4899", "#8b5cf6", "#06b6d4", "#fbbf24", "#10b981"][
                      Math.floor(Math.random() * 5)
                    ],
                    animation: `confetti ${2 + Math.random() * 2}s linear forwards`,
                    animationDelay: `${Math.random() * 0.5}s`,
                  }}
                />
              ))}
            </>
          )}

          <Card className="p-6 md:p-8 max-w-md w-full text-center victory-animation">
            <div className="mb-6">
              {winner === "player" ? (
                <>
                  <div className="text-6xl md:text-8xl mb-4 animate-bounce">🏆</div>
                  <h2 className="font-display text-3xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
                    VICTORY!
                  </h2>
                  <p className="text-lg md:text-xl text-muted-foreground mb-4">You defeated the opponent!</p>
                  <div className="space-y-2 bg-primary/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm md:text-base">Points Earned:</span>
                      <span className="text-xl md:text-2xl font-bold text-yellow-500">+100 APE</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm md:text-base">Tickets Earned:</span>
                      <span className="text-xl md:text-2xl font-bold text-pink-500">+2 🎫</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-6xl md:text-8xl mb-4">💔</div>
                  <h2 className="font-display text-3xl md:text-5xl font-bold text-red-500 mb-2">DEFEAT</h2>
                  <p className="text-lg md:text-xl text-muted-foreground">Better luck next time!</p>
                </>
              )}
            </div>

            <div className="space-y-3">
              <Button onClick={resetGame} size="lg" className="w-full text-lg">
                Play Again
              </Button>
              <Button onClick={() => (window.location.href = "/arcade")} variant="outline" size="lg" className="w-full">
                Back to Arcade
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
