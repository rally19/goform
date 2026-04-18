"use client";

import { useMyPresence, useOthers } from "@liveblocks/react";
import { useRef, useCallback, ReactNode, useEffect, useState } from "react";
import { Cursor } from "./cursors";

interface CursorAreaProps {
  id: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  isDragging?: boolean;
}

export function CursorArea({ id, children, className, onClick, isDragging = false }: CursorAreaProps) {
  const [myPresence, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep isDragging in a ref so the stable useEffect closure can read the latest value
  const isDraggingRef = useRef(isDragging);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const dragging = isDraggingRef.current;

      // During drag: skip bounds + occlusion checks — the DragOverlay sits on top
      // and would otherwise cause both checks to reject the event.
      if (!dragging) {
        // Boundary check: Is the pointer within this specific CursorArea?
        const isWithinBounds = (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        );
        if (!isWithinBounds) return;

        // Occlusion check: Is there something (like a Sheet or Sidebar) physically over the canvas?
        const targetAtPoint = document.elementFromPoint(e.clientX, e.clientY);
        const isOccluded = targetAtPoint && !containerRef.current.contains(targetAtPoint);
        if (isOccluded) return;
      }

      const isOccluded = false; // not used below when dragging; false keeps hidden: false

      // Coordinates relative to container
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      let rowType: "header" | "field" | "gap" | "gutter-top" | "gutter-bottom" = "gutter-top";
      let rowId: string | undefined;
      let colType: "left" | "center" | "right" = "center";
      let relX = 0;
      let relY = 0;

      const rootEl = containerRef.current.querySelector('[data-cursor-area-root="true"]') as HTMLElement;
      
      if (rootEl) {
        const rootRect = rootEl.getBoundingClientRect();
        
        // --- Horizontal Detection ---
        const rootOffsetLeft = rootRect.left - rect.left;
        const rootOffsetRight = rootRect.right - rect.left;
        const localX = e.clientX - rect.left;

        if (localX < rootOffsetLeft) {
          colType = "left";
          const leftGutterWidth = rootOffsetLeft;
          relX = leftGutterWidth > 0 
            ? Math.max(0, Math.min(1, (rootOffsetLeft - localX) / leftGutterWidth))
            : 0;
        } else if (localX > rootOffsetRight) {
          colType = "right";
          const rightGutterWidth = rect.width - rootOffsetRight;
          relX = rightGutterWidth > 0
            ? Math.max(0, Math.min(1, (localX - rootOffsetRight) / rightGutterWidth))
            : 0;
        } else {
          colType = "center";
          relX = (localX - rootOffsetLeft) / rootRect.width;
        }

        // --- Vertical Row Detection (Anchors) ---
        const anchorEls = Array.from(containerRef.current.querySelectorAll("[data-cursor-id]"));
        const sortedAnchors = anchorEls.map(el => ({
          el,
          rect: el.getBoundingClientRect(),
          id: el.getAttribute("data-cursor-id")!
        })).sort((a, b) => a.rect.top - b.rect.top);

        if (sortedAnchors.length > 0) {
          const first = sortedAnchors[0];
          const last = sortedAnchors[sortedAnchors.length - 1];

          if (e.clientY < first.rect.top) {
            rowType = "gutter-top";
            relY = (first.rect.top - e.clientY) / 200;
          } else if (e.clientY > last.rect.bottom) {
            rowType = "gutter-bottom";
            relY = (e.clientY - last.rect.bottom) / 200;
          } else {
            for (let i = 0; i < sortedAnchors.length; i++) {
              const current = sortedAnchors[i];
              if (e.clientY >= current.rect.top && e.clientY <= current.rect.bottom) {
                rowType = current.el.getAttribute("data-cursor-type") as any || "field";
                rowId = current.id;
                relY = (e.clientY - current.rect.top) / current.rect.height;
                break;
              }
              if (i < sortedAnchors.length - 1) {
                const next = sortedAnchors[i+1];
                if (e.clientY > current.rect.bottom && e.clientY < next.rect.top) {
                  rowType = "gap";
                  rowId = next.id;
                  relY = (e.clientY - current.rect.bottom) / (next.rect.top - current.rect.bottom);
                  break;
                }
              }
            }
          }
        } else {
          // Fallback if no anchors in root
          rowType = "field";
          relY = (e.clientY - rootRect.top) / rootRect.height;
        }
      } else {
        // Simple relative tracking for areas without a root
        rowType = "field";
        colType = "center";
        relX = x / rect.width; 
        relY = y / rect.height;
        
        const target = document.elementFromPoint(e.clientX, e.clientY);
        rowId = (target as HTMLElement)?.closest("[data-cursor-id]")?.getAttribute("data-cursor-id") || undefined;
      }

      updateMyPresence({
        cursor: {
          x, y,
          area: id,
          rowType,
          rowId,
          colType,
          relX,
          relY,
          hidden: isDraggingRef.current ? false : !!isOccluded // Always show if dragging
        },
      });
    };

    const handlePointerLeave = (e: PointerEvent) => {
      // Clear if moving completely out of bounds (handled by window listeners)
    };

    // Synthesize a PointerEvent-like object from a TouchEvent for cursor tracking during drag
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      // Construct a minimal synthetic object matching what handlePointerMove expects
      handlePointerMove({
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as PointerEvent);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);
    // Track touch position during drag (fires even when pointer is captured by dnd-kit)
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [id, updateMyPresence, myPresence?.cursor?.area]);

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => updateMyPresence({ cursor: null })}
      className={className}
      style={{ 
        position: "relative",
        // pan-y at rest so mobile can scroll; switches to none during drag so dnd-kit
        // gets uninterrupted pointer capture for accurate drop detection.
        touchAction: (id.startsWith("canvas-") || id === "canvas") && isDragging ? "none" : "pan-y"
      }}
      onClick={onClick}
    >
      {children}
      
      {/* Local Cursors for this area */}
      {others.map(({ connectionId, presence, info }) => {
        if (!presence?.cursor || presence.cursor.area !== id || !info) return null;
        return (
          <CursorFollower 
            key={connectionId}
            cursor={presence.cursor}
            info={info}
            containerRef={containerRef}
          />
        );
      })}
    </div>
  );
}

function CursorFollower({ cursor, info, containerRef }: { 
  cursor: any; 
  info: any; 
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [pos, setPos] = useState({ left: "0px", top: "0px", opacity: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const rootEl = containerRef.current.querySelector('[data-cursor-area-root="true"]');
      const rootRect = rootEl ? rootEl.getBoundingClientRect() : containerRect;
      const areaHeight = containerRect.height;

      let finalX = 0;
      let finalY = 0;

      // --- Horizontal Resolve ---
      const rootOffsetLeft = rootRect.left - containerRect.left;
      const rootOffsetRight = rootRect.right - containerRect.left;

      if (cursor.colType === "left") {
        const localLeftGutterWidth = rootOffsetLeft;
        finalX = rootOffsetLeft - (cursor.relX * localLeftGutterWidth);
      } else if (cursor.colType === "right") {
        const localRightGutterWidth = containerRect.width - rootOffsetRight;
        finalX = rootOffsetRight + (cursor.relX * localRightGutterWidth);
      } else {
        finalX = rootOffsetLeft + (cursor.relX * rootRect.width);
      }

      // --- Vertical Resolve ---
      if (cursor.rowType === "gutter-top" || cursor.rowType === "gutter-bottom") {
        finalY = cursor.rowType === "gutter-top" ? 0 : areaHeight;
      } else {
        const targetEl = containerRef.current?.querySelector(`[data-cursor-id="${cursor.rowId}"]`);
        if (targetEl) {
          const targetRect = targetEl.getBoundingClientRect();
          if (cursor.rowType === "gap") {
            const allAnchors = Array.from(containerRef.current?.querySelectorAll("[data-cursor-id]") || []);
            const targetIdx = allAnchors.findIndex(el => el.getAttribute("data-cursor-id") === cursor.rowId);
            const prevEl = targetIdx > 0 ? allAnchors[targetIdx - 1] : null;
            if (prevEl) {
              const prevRect = prevEl.getBoundingClientRect();
              const gapHeight = targetRect.top - prevRect.bottom;
              finalY = prevRect.bottom - containerRect.top + (cursor.relY * gapHeight);
            } else {
              finalY = targetRect.top - containerRect.top - 20;
            }
          } else {
            finalY = targetRect.top - containerRect.top + (cursor.relY * targetRect.height);
          }
        }
      }

      setPos({ 
        left: `${finalX}px`, 
        top: `${finalY}px`, 
        opacity: cursor.hidden ? 0 : 1 
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [cursor, containerRef]);

  return (
    <div 
      className="absolute pointer-events-none z-50"
      style={{
        left: pos.left,
        top: pos.top,
        opacity: pos.opacity,
        // Smooth position tracking (75ms) but SLOW fade-in (500ms) to prevent snaps
        transition: cursor.hidden 
          ? "opacity 150ms ease-out, left 75ms linear, top 75ms linear" 
          : "opacity 500ms ease-in, left 75ms linear, top 75ms linear"
      }}
    >
      <Cursor color={info.color} name={info.name} />
    </div>
  );
}
