"use client";

import { useMyPresence, useOthers } from "@liveblocks/react";
import { useRef, useCallback, ReactNode, useEffect, useState } from "react";
import { Cursor } from "./cursors";

interface CursorAreaProps {
  id: "components" | "canvas" | "settings";
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function CursorArea({ id, children, className, onClick }: CursorAreaProps) {
  const [, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      
      // Boundary check: Is the pointer within this specific CursorArea?
      const isWithinBounds = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );

      if (!isWithinBounds) {
        // Only clear if we were the ones who last set it
        // (This prevents multiple CursorAreas fighting for the same presence)
        // updateMyPresence({ cursor: null }); 
        return;
      }

      // Default coordinates relative to container
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      let rowType: "header" | "field" | "gap" | "gutter-top" | "gutter-bottom" = "gutter-top";
      let rowId: string | undefined;
      let colType: "left" | "center" | "right" = "center";
      let relX = 0;
      let relY = 0;

      if (id === "canvas") {
        const rootEl = containerRef.current.querySelector('[data-cursor-area-root="true"]');
        if (rootEl) {
          const rootRect = rootEl.getBoundingClientRect();
          
          // --- Horizontal Detection (Container-Relative) ---
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
            relX = localX - rootOffsetLeft; // Absolute pixel mapping
          }

          // --- Vertical Row Detection ---
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
                  const next = sortedAnchors[i + 1];
                  if (e.clientY > current.rect.bottom && e.clientY < next.rect.top) {
                    rowType = "gap";
                    rowId = next.id;
                    relY = (e.clientY - current.rect.bottom) / (next.rect.top - current.rect.bottom);
                    break;
                  }
                }
              }
            }
          }
        }
      } else {
        // Sidebar tracking
        const target = document.elementFromPoint(e.clientX, e.clientY);
        rowType = "field";
        rowId = (target as HTMLElement)?.closest("[data-cursor-id]")?.getAttribute("data-cursor-id") || undefined;
        colType = "center";
        relX = x; 
        relY = y / rect.height;
      }

      updateMyPresence({
        cursor: {
          x, y,
          area: id,
          rowType,
          rowId,
          colType,
          relX,
          relY
        },
      });
    };

    const handlePointerLeave = (e: PointerEvent) => {
      // If the pointer actually leaves the browser or the specific container
      // (Simplified: let the bounds check in pointermove handle mostly everything)
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [id, updateMyPresence]);

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => updateMyPresence({ cursor: null })}
      className={className}
      style={{ position: "relative" }}
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
      if (!rootEl) return;
      
      const rootRect = rootEl.getBoundingClientRect();
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
        finalX = rootOffsetLeft + cursor.relX; // Pixel mapping
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

      setPos({ left: `${finalX}px`, top: `${finalY}px`, opacity: 1 });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [cursor, containerRef]);

  return (
    <div 
      className="absolute pointer-events-none z-50 transition-all duration-75"
      style={{
        left: pos.left,
        top: pos.top,
        opacity: pos.opacity,
      }}
    >
      <Cursor color={info.color} name={info.name} />
    </div>
  );
}
