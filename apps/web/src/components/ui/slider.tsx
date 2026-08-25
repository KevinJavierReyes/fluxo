"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

/**
 * Slider de rango (dos thumbs). Base UI expone Root/Control/Track/Indicator/Thumb.
 */
function RangeSlider({
  className,
  value,
  onValueChange,
  onValueCommitted,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  "aria-label": ariaLabel,
}: {
  className?: string
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  /** Se dispara al soltar el thumb: úsalo para no consultar en cada pixel. */
  onValueCommitted?: (value: [number, number]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  "aria-label"?: string
}) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={value as unknown as readonly number[]}
      onValueChange={(next) => {
        const values = next as readonly number[]
        onValueChange([values[0], values[1]])
      }}
      onValueCommitted={(next) => {
        const values = next as readonly number[]
        onValueCommitted?.([values[0], values[1]])
      }}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={cn("relative w-full select-none", className)}
    >
      <SliderPrimitive.Control className="flex h-5 w-full touch-none items-center py-2">
        <SliderPrimitive.Track className="h-1.5 w-full rounded-full bg-muted select-none">
          <SliderPrimitive.Indicator className="rounded-full bg-primary select-none" />
          <SliderPrimitive.Thumb
            index={0}
            getAriaLabel={() => `${ariaLabel ?? "Rango"} mínimo`}
            className="size-4 rounded-full bg-background ring-2 ring-primary transition-shadow outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/60"
          />
          <SliderPrimitive.Thumb
            index={1}
            getAriaLabel={() => `${ariaLabel ?? "Rango"} máximo`}
            className="size-4 rounded-full bg-background ring-2 ring-primary transition-shadow outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/60"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { RangeSlider }
