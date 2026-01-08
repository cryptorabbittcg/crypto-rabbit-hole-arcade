"use client"

import { useState, useRef, ChangeEvent } from "react"
import { useDisconnect as useWagmiDisconnect } from "wagmi"

import { useArcade } from "@/components/providers"
import { clearAuthToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const geometricPresets = [
  {
    id: "/placeholder-logo.png",
    label: "Neon Glyph",
  },
  {
    id: "/placeholder-logo.svg",
    label: "Wireframe",
  },
  {
    id: "/placeholder.jpg",
    label: "Soft Grid",
  },
] as const

function sanitizeUsername(value: string) {
  return value.trim()
}

export function ProfileMenu() {
  const { isConnected, connect, disconnect, profile, updateProfile, address, tickets, apeBalance, isAuthenticated, logout } = useArcade()
  const [open, setOpen] = useState(false)
  const { disconnect: disconnectWallet } = useWagmiDisconnect()

  const [username, setUsername] = useState(profile.username)
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatar || geometricPresets[0].id)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const currentAvatar = avatarUrl || geometricPresets[0].id

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUsername(e.target.value)
    setUsernameError(null)
  }

  function handlePresetSelect(url: string) {
    setAvatarUrl(url)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setAvatarUrl(objectUrl)
  }

  function validateUsername(value: string) {
    const trimmed = sanitizeUsername(value)
    if (!trimmed) {
      return "Username is required."
    }
    if (!/^[A-Za-z0-9]{3,16}$/.test(trimmed)) {
      return "Use 3-16 characters, letters and numbers only."
    }
    // NOTE: Global uniqueness should be enforced server-side or via an API.
    return null
  }

  function handleSave() {
    const trimmed = sanitizeUsername(username)
    const error = validateUsername(trimmed)
    if (error) {
      setUsernameError(error)
      return
    }

    updateProfile({
      username: trimmed,
      avatar: currentAvatar,
    })

    setOpen(false)
  }

  async function handleConnectClick() {
    if (!isConnected) {
      // Close profile menu and show auth dialog
      setOpen(false)
      // Trigger a custom event that the arcade hub can listen to
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("showAuthDialog"))
        console.log("🔔 Dispatched showAuthDialog event")
      })
    } else {
      // Disconnect: clear wagmi connection, hub auth token, and hub session
      if (isConnected) {
        try {
          disconnectWallet()
        } catch (error) {
          console.error("Error disconnecting wallet:", error)
        }
      }
      // Call our disconnect handler (which clears hub auth token and session)
      await disconnect()
    }
  }

  const triggerLabel = isConnected ? "Profile" : "Connect Wallet"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={cn(
            "bg-primary text-primary-foreground hover:bg-primary/90 text-xs md:text-sm",
            isConnected && "bg-primary/20 text-primary border border-primary/40 backdrop-blur",
          )}
        >
          {isConnected && (
            <div className="mr-2 hidden sm:flex items-center gap-2">
              <Avatar className="h-6 w-6 border border-primary/60 shadow-[0_0_10px_hsl(var(--neon-cyan)/0.7)]">
                <AvatarImage src={currentAvatar} alt={profile.username} />
                <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="max-w-[120px] truncate font-medium">{profile.username}</span>
            </div>
          )}
          <span className="sm:hidden">{triggerLabel}</span>
          <span className="hidden sm:inline">{triggerLabel}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Wallet &amp; Profile</DialogTitle>
          <DialogDescription>
            Connect your wallet, choose a profile image, and set a unique username for The Crypto Rabbit Hole® Arcade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wallet section */}
          <section className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Wallet connection</p>
                <p className="text-xs text-muted-foreground">
                  Connect your ApeChain wallet (read-only for game items &amp; $APE balance).
                </p>
              </div>
              <Button size="sm" variant={isConnected ? "outline" : "default"} onClick={handleConnectClick}>
                {isConnected ? "Disconnect" : "Connect"}
              </Button>
            </div>
            {isConnected && (
              <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
                <div className="font-mono break-all">
                  <span className="text-emerald-400 mr-1">Address:</span>
                  {address}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-amber-300">Golden Tickets:</span>
                  <span className="font-mono text-amber-100">{ticketsPreview(tickets)}</span>
                  <span className="text-cyan-300 ml-2">$APE Balance:</span>
                  <span className="font-mono text-cyan-100">{apeBalance} APE</span>
                </div>
              </div>
            )}
          </section>

          {/* Profile section */}
          <section className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary shadow-[0_0_20px_hsl(var(--neon-cyan)/0.6)]">
                <AvatarImage src={currentAvatar} alt={username || profile.username} />
                <AvatarFallback>{(username || profile.username).slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Username</label>
                <Input
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="Choose a unique handle"
                  maxLength={16}
                />
                <p className="text-[11px] text-muted-foreground">
                  3–16 characters, letters and numbers only. Global uniqueness will be enforced across the ecosystem.
                </p>
                {usernameError && <p className="text-[11px] text-destructive">{usernameError}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Profile image</p>
              <div className="flex flex-wrap gap-3">
                {geometricPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id)}
                    className={cn(
                      "relative h-12 w-12 rounded-full border transition-all hover:scale-105",
                      "border-border bg-muted/40 overflow-hidden",
                      currentAvatar === preset.id && "ring-2 ring-cyan-400 border-cyan-400",
                    )}
                  >
                    <Avatar className="h-full w-full">
                      <AvatarImage src={preset.id} alt={preset.label} />
                      <AvatarFallback>{preset.label[0]}</AvatarFallback>
                    </Avatar>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border text-[10px] text-muted-foreground hover:border-cyan-400 hover:text-cyan-200 transition-colors",
                  )}
                >
                  Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="mt-4">
          {isAuthenticated && (
            <Button type="button" variant="destructive" onClick={async () => { 
              // Disconnect wagmi wallet if connected
              if (isConnected) {
                try {
                  disconnectWallet()
                } catch (error) {
                  console.error("Error disconnecting wallet:", error)
                }
              }
              // Logout clears auth token and game session
              logout(); 
              setOpen(false); 
            }}>
              Logout
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ticketsPreview(tickets: number) {
  if (tickets < 0) return 0
  return tickets
}

export default ProfileMenu


