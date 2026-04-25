"use client";

import dynamic from "next/dynamic";

// Simple skeleton component to avoid circular import
function AdminLiveblocksSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse border-border/40 rounded-xl border p-4">
            <div className="h-16 bg-muted/20 rounded" />
            <div className="h-12 bg-muted/20 rounded mt-2" />
          </div>
        ))}
      </div>
      <div className="animate-pulse border-border/40 rounded-xl border p-6">
        <div className="h-20 bg-muted/20 rounded" />
        <div className="h-64 bg-muted/20 rounded mt-4" />
      </div>
    </div>
  );
}

// Dynamically import LiveblocksMonitor to prevent SSR issues
const LiveblocksMonitor = dynamic(() => import("./liveblocks-monitor").then(mod => ({ default: mod.LiveblocksMonitor })), {
  ssr: false,
  loading: () => <AdminLiveblocksSkeleton />
});

export function LiveblocksMonitorWrapper() {
  return <LiveblocksMonitor />;
}
