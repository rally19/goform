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
    
    // Default relative to container
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    let anchorId: string | undefined;
    let relY: number | undefined;

    if (id === "canvas") {
      const rootEl = containerRef.current.querySelector('[data-cursor-area-root="true"]');
      if (rootEl) {
        const rootRect = rootEl.getBoundingClientRect();
        // x remains relative to the centered form container
        x = e.clientX - rootRect.left;
        
        // --- Nearest Anchor Detection ---
        // We find the nearest vertical component to anchor to.
        // This ensures gaps and gutters stay accurate.
        const anchors = Array.from(containerRef.current.querySelectorAll("[data-cursor-id]"));
        let closestAnchor: Element | null = null;
        let minDistance = Infinity;

        anchors.forEach((anchor) => {
          const anchorRect = anchor.getBoundingClientRect();
          // We calculate distance to the top-edge of the component
          const distance = Math.abs(e.clientY - (anchorRect.top + anchorRect.height / 2));
          if (distance < minDistance) {
            minDistance = distance;
            closestAnchor = anchor;
          }
        });

        if (closestAnchor) {
          const anchorEl = closestAnchor as HTMLElement;
          anchorId = anchorEl.getAttribute("data-cursor-id") || undefined;
          const anchorRect = anchorEl.getBoundingClientRect();
          relY = e.clientY - anchorRect.top;
        }
      }
    } else {
      // For sidebars, detect component if hovering over it
      const target = e.target as HTMLElement;
      anchorId = target.closest("[data-cursor-id]")?.getAttribute("data-cursor-id") || undefined;
      
      // Percentage based normalization for panels
      x = (x / rect.width) * 100;
      y = (y / rect.height) * 100;
    }

    updateMyPresence({
      cursor: {
        x,
        y, // fallback y
        area: id,
        anchorId,
        relY,
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
            areaId={id}
          />
        );
      })}
    </div>
  );
}

function CursorFollower({ cursor, info, containerRef, areaId }: { 
  cursor: any; 
  info: any; 
  containerRef: React.RefObject<HTMLDivElement | null>;
  areaId: string;
}) {
  const [pos, setPos] = useState({ left: "0px", top: "0px" });

  useEffect(() => {
    const updatePosition = () => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();

      // 1. Segmented Anchored Positioning (Optimal for Gaps and Fields)
      if (areaId === "canvas" && cursor.anchorId && cursor.relY !== undefined) {
        const anchor = containerRef.current.querySelector(`[data-cursor-id="${cursor.anchorId}"]`);
        const root = containerRef.current.querySelector('[data-cursor-area-root="true"]');
        
        if (anchor && root) {
          const anchorRect = anchor.getBoundingClientRect();
          const rootRect = root.getBoundingClientRect();
          
          setPos({
            left: `${rootRect.left - containerRect.left + cursor.x}px`,
            top: `${anchorRect.top - containerRect.top + cursor.relY}px`,
          });
          return;
        }
      }

      // 2. Fallback: Area-Relative Positioning (Panels)
      if (areaId !== "canvas") {
        setPos({
          left: `${cursor.x}%`,
          top: `${cursor.y}%`,
        });
      } else {
        setPos({
          left: `${cursor.x}px`,
          top: `${cursor.y}px`,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [cursor, areaId, containerRef]);

  return (
    <div 
      className="absolute pointer-events-none z-50 transition-all duration-75"
      style={{
        left: pos.left,
        top: pos.top,
      }}
    >
      <Cursor color={info.color} name={info.name} />
    </div>
  );
}
