"use client";

import { useOthers, useMyPresence } from "@liveblocks/react";
import { memo, useEffect, useState } from "react";

function Cursor({ color, name, x, y }: { color: string; name: string; x: number; y: number }) {
  return (
    <div
      className="fixed top-0 left-0 transition-transform duration-75 pointer-events-none z-[9999]"
      style={{
        transform: `translateX(${x}px) translateY(${y}px)`,
      }}
    >
      <svg
        className="relative"
        width="24"
        height="36"
        viewBox="0 0 24 36"
        fill="none"
        stroke="white"
        strokeWidth="2"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={color}
        />
      </svg>
      <div
        className="absolute left-4 top-4 px-1.5 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-sm"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  );
}

export function Cursors() {
  const others = useOthers();

  return (
    <>
      {others.map(({ connectionId, presence, info }: any) => {
        if (!presence?.cursor || !info) return null;

        return (
          <Cursor
            key={connectionId}
            color={info.color}
            name={info.name}
            x={presence.cursor.x}
            y={presence.cursor.y}
          />
        );
      })}
    </>
  );
}

export function useCursorTracking() {
  const [, updateMyPresence] = useMyPresence();

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      updateMyPresence({
        cursor: {
          x: event.clientX,
          y: event.clientY,
        },
      });
    }

    function handleMouseLeave() {
      updateMyPresence({ cursor: null });
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [updateMyPresence]);
}
