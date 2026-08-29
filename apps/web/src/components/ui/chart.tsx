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

/**
 * Punto de corte (0-1, de arriba hacia abajo) donde una serie cruza el cero,
 * para usar como offset en un `<linearGradient>` vertical y así pintar la
 * parte positiva de un color y la negativa de otro. Ver ejemplo oficial de
 * Recharts "Area Chart Fill By Value".
 */
export function zeroCrossingOffset(values: number[]): number {
  if (values.length === 0) return 1
  const max = Math.max(...values)
  const min = Math.min(...values)
  if (max <= 0) return 0
  if (min >= 0) return 1
  return max / (max - min)
}

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
