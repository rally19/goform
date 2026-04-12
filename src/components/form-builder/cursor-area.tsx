"use client";

import { useMyPresence, useOthers } from "@liveblocks/react";
import { useRef, useCallback, ReactNode, useEffect, useState } from "react";
import { Cursor } from "./cursors";

interface CursorAreaProps {
  id: "components" | "canvas" | "settings";
  children: ReactNode;
  className?: string;
}

export function CursorArea({ id, children, className }: CursorAreaProps) {
  const [, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    
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
        
        // --- 1. Horizontal Column Detection ---
        if (e.clientX < rootRect.left) {
          colType = "left";
          relX = Math.max(0, Math.min(1, (rootRect.left - e.clientX) / rootRect.left));
        } else if (e.clientX > rootRect.right) {
          colType = "right";
          const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 2000;
          relX = Math.max(0, Math.min(1, (e.clientX - rootRect.right) / (windowWidth - rootRect.right)));
        } else {
          colType = "center";
          relX = (e.clientX - rootRect.left) / rootRect.width;
        }

        // --- 2. Vertical Row Detection ---
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
            relY = (first.rect.top - e.clientY) / 200; // arbitrary gutter mapping
          } else if (e.clientY > last.rect.bottom) {
            rowType = "gutter-bottom";
            relY = (e.clientY - last.rect.bottom) / 200;
          } else {
            // Check if inside a row or a gap
            let found = false;
            for (let i = 0; i < sortedAnchors.length; i++) {
              const current = sortedAnchors[i];
              
              if (e.clientY >= current.rect.top && e.clientY <= current.rect.bottom) {
                rowType = current.el.getAttribute("data-cursor-type") as any || "field";
                rowId = current.id;
                relY = (e.clientY - current.rect.top) / current.rect.height;
                found = true;
                break;
              }

              // Check gap between this and next
              if (i < sortedAnchors.length - 1) {
                const next = sortedAnchors[i + 1];
                if (e.clientY > current.rect.bottom && e.clientY < next.rect.top) {
                  rowType = "gap";
                  rowId = next.id; // Anchor gap to the following element
                  relY = (e.clientY - current.rect.bottom) / (next.rect.top - current.rect.bottom);
                  found = true;
                  break;
                }
              }
            }
          }
        }
      }
    } else {
      // Sidebar tracking (standard percentage)
      const target = e.target as HTMLElement;
      rowType = "field";
      rowId = target.closest("[data-cursor-id]")?.getAttribute("data-cursor-id") || undefined;
      colType = "center";
      relX = x / rect.width;
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
  }, [id, updateMyPresence]);

  const handleMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ position: "relative" }}
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
      const areaWidth = containerRect.width;
      const areaHeight = containerRect.height;

      let finalX = 0;
      let finalY = 0;

      // --- 1. Horizontal Resolve ---
      if (cursor.colType === "left") {
        finalX = rootRect.left - containerRect.left - (cursor.relX * rootRect.left);
      } else if (cursor.colType === "right") {
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 2000;
        const rightWidth = windowWidth - rootRect.right;
        finalX = rootRect.right - containerRect.left + (cursor.relX * rightWidth);
      } else {
        finalX = rootRect.left - containerRect.left + (cursor.relX * rootRect.width);
      }

      // --- 2. Vertical Resolve ---
      if (cursor.rowType === "gutter-top" || cursor.rowType === "gutter-bottom") {
        // Fallback for extreme gutters
        finalY = cursor.rowType === "gutter-top" ? 0 : areaHeight;
      } else {
        const targetEl = containerRef.current?.querySelector(`[data-cursor-id="${cursor.rowId}"]`);
        if (targetEl) {
          const targetRect = targetEl.getBoundingClientRect();
          
          if (cursor.rowType === "gap") {
            // Find element BEFORE this rowId to get the gap bound
            const allAnchors = Array.from(containerRef.current?.querySelectorAll("[data-cursor-id]") || []);
            const targetIdx = allAnchors.findIndex(el => el.getAttribute("data-cursor-id") === cursor.rowId);
            const prevEl = targetIdx > 0 ? allAnchors[targetIdx - 1] : null;
            
            if (prevEl) {
              const prevRect = prevEl.getBoundingClientRect();
              const gapHeight = targetRect.top - prevRect.bottom;
              finalY = prevRect.bottom - containerRect.top + (cursor.relY * gapHeight);
            } else {
              finalY = targetRect.top - containerRect.top - 20; // Fallback
            }
          } else {
            // Directly over component
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
