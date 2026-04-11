export function Cursor({ color, name }: { color: string; name: string }) {
  return (
    <div className="relative pointer-events-none">
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

// Cursors component is now handled locally by CursorArea
export function Cursors() {
  return null;
}

export function useCursorTracking() {
  // Global tracking disabled in favor of Localized CursorArea
  return null;
}
