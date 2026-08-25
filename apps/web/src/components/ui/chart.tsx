"use client"

import * as React from "react"
import { ResponsiveContainer } from "recharts"

import { cn } from "@/lib/utils"

/**
 * Estilos compartidos de los gráficos. Todo sale de variables CSS del tema para
 * que los charts sigan el modo claro/oscuro sin lógica extra.
 */
export const CHART_COLORS = {
  grid: "var(--color-border)",
  axis: "var(--color-muted-foreground)",
  primary: "var(--color-primary)",
  income: "var(--color-success)",
  expense: "var(--color-destructive)",
} as const

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 13,
  boxShadow: "0 4px 16px rgb(0 0 0 / 0.08)",
}

export const CHART_AXIS_TICK = {
  fontSize: 12,
  fill: CHART_COLORS.axis,
} as const

function ChartContainer({
  height = 260,
  className,
  children,
}: {
  height?: number
  className?: string
  children: React.ReactElement
}) {
  return (
    <div data-slot="chart" className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

export { ChartContainer }
