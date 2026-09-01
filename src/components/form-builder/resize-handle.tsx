"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ResizeHandleProps {
  side: "left" | "right";
  width: number;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  onWidthChange: (width: number) => void;
  onResizeEnd?: (width: number) => void;
  accentColor?: string;
  className?: string;
}

export function ResizeHandle({
  side,
  width,
  minWidth,
  maxWidth,
  defaultWidth,
  onWidthChange,
  onResizeEnd,
  accentColor,
  className,
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartRef = useRef<{ startX: number; startWidth: number; currentWidth: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = width;
      dragStartRef.current = { startX, startWidth, currentWidth: startWidth };
      setIsDragging(true);

      const target = e.currentTarget;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // Fallback for older browsers
      }

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!dragStartRef.current) return;
        const delta = moveEvent.clientX - dragStartRef.current.startX;
        const rawWidth =
          side === "left"
            ? dragStartRef.current.startWidth + delta
            : dragStartRef.current.startWidth - delta;

        const clamped = Math.max(minWidth, Math.min(maxWidth, rawWidth));
        dragStartRef.current.currentWidth = clamped;
        onWidthChange(clamped);
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        setIsDragging(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        if (dragStartRef.current) {
          onResizeEnd?.(dragStartRef.current.currentWidth);
        }
        dragStartRef.current = null;

        try {
          target.releasePointerCapture(upEvent.pointerId);
        } catch {
          // Fallback
        }

        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [side, width, minWidth, maxWidth, onWidthChange, onResizeEnd]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onWidthChange(defaultWidth);
      onResizeEnd?.(defaultWidth);
    },
    [defaultWidth, onWidthChange, onResizeEnd]
  );

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 20 : 5;
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                const next = Math.max(
                  minWidth,
                  Math.min(maxWidth, side === "left" ? width - step : width + step)
                );
                onWidthChange(next);
                onResizeEnd?.(next);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                const next = Math.max(
                  minWidth,
                  Math.min(maxWidth, side === "left" ? width + step : width - step)
                );
                onWidthChange(next);
                onResizeEnd?.(next);
              } else if (e.key === "Home" || e.key === "End") {
                e.preventDefault();
                onWidthChange(defaultWidth);
                onResizeEnd?.(defaultWidth);
              }
            }}
            className={cn(
              "relative z-30 flex items-center justify-center cursor-col-resize select-none touch-none shrink-0 transition-colors",
              "w-2 -mx-1 hover:w-2 active:w-2",
              className
            )}
          >
            {/* Visual thin line */}
            <div
              className={cn(
                "w-[1px] h-full transition-all duration-150",
                isDragging
                  ? "w-[2px] bg-primary shadow-sm"
                  : isHovered
                  ? "w-[2px] bg-primary/70"
                  : "bg-border"
              )}
              style={
                (isDragging || isHovered) && accentColor
                  ? { backgroundColor: accentColor }
                  : undefined
              }
            />

            {/* Central Grip Indicator */}
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 h-8 w-3.5 rounded-full border border-border bg-card shadow-sm flex items-center justify-center transition-all duration-150",
                isDragging
                  ? "scale-110 opacity-100 border-primary shadow-md"
                  : isHovered
                  ? "scale-100 opacity-100 shadow-sm"
                  : "scale-90 opacity-0 group-hover:opacity-100"
              )}
              style={
                isDragging && accentColor
                  ? { borderColor: accentColor }
                  : undefined
              }
            >
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side={side === "left" ? "right" : "left"} className="text-[10px] py-1 px-2">
          <span>Drag to resize • Double-click to reset</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
