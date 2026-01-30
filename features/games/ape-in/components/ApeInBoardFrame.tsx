"use client"

import type { ReactNode } from "react"

export function ApeInBoardFrame({
  children,
  className = "",
  contentClassName = "",
}: {
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <div
      className={[
        "min-h-[600px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative",
        className,
      ].join(" ")}
    >
      <div className={contentClassName}>{children}</div>
    </div>
  )
}

