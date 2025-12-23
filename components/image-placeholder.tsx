import { cn } from "@/lib/utils"

interface ImagePlaceholderProps {
  label: string
  className?: string
  aspectRatio?: "square" | "video" | "banner" | "card"
}

const aspectRatioClasses = {
  square: "aspect-square",
  video: "aspect-video",
  banner: "aspect-[16/6]",
  card: "aspect-[4/5]",
}

export function ImagePlaceholder({ label, className, aspectRatio = "video" }: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-black/40",
        aspectRatioClasses[aspectRatio],
        className,
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center text-[0.7rem] font-mono uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

