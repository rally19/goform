import React from "react";

export default function MarketingLoading() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Navbar Placeholder */}
      <div className="h-16 border-b border-border/40 bg-background/95 animate-pulse" />
      
      <div className="flex-1 space-y-20 py-20">
        {/* Hero Skeleton */}
        <div className="container px-4 flex flex-col items-center gap-8">
          <div className="h-4 w-32 bg-muted rounded-full animate-pulse" />
          <div className="h-20 w-full max-w-3xl bg-muted rounded-2xl animate-pulse" />
          <div className="h-8 w-full max-w-xl bg-muted rounded-lg animate-pulse" />
          <div className="flex gap-4">
            <div className="h-12 w-40 bg-muted rounded-xl animate-pulse" />
            <div className="h-12 w-40 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Features Skeleton */}
        <div className="container px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-8 rounded-2xl border border-border bg-card space-y-4">
              <div className="h-12 w-12 bg-muted rounded-xl animate-pulse" />
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-16 w-full bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
