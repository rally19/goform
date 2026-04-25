"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Activity, RefreshCw, Eye } from "lucide-react";
import Link from "next/link";
import { ActiveUsersDialog } from "@/components/ui/active-users-dialog";

// Simple date formatting function to replace date-fns
function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

// Function to strip HTML tags from rich text
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

interface RoomStats {
  formId: string;
  formTitle: string;
  formSlug: string;
  createdAt: string;
  activeUsers: number;
  lastActivity: string | null;
}

interface LiveblocksStatsResponse {
  rooms: RoomStats[];
  totalForms: number;
  totalActiveUsers: number;
  summary: {
    activeRooms: number;
    mostActiveRoom: number;
  };
}

export function LiveblocksMonitor() {
  const [stats, setStats] = useState<LiveblocksStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [displayCount, setDisplayCount] = useState(5);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/admin/liveblocks-stats");
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStats(data);
      setLastRefresh(new Date());
      setDisplayCount(5); // Reset display count when data refreshes
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch statistics");
    } finally {
      setLoading(false);
    }
  };

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && stats && displayCount < stats.rooms.length) {
          setDisplayCount(prev => Math.min(prev + 5, stats.rooms.length));
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [stats, displayCount]);

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Liveblocks Room Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading room statistics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Liveblocks Room Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchStats} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalForms}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalActiveUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.summary.activeRooms}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Most Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.summary.mostActiveRoom}</div>
            <p className="text-xs text-muted-foreground">users in one room</p>
          </CardContent>
        </Card>
      </div>

      {/* Room List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Room Activity
              </CardTitle>
              <CardDescription>
                Real-time activity across all Liveblocks rooms
                <span className="ml-2 text-xs">
                  Last updated: {formatDistanceToNow(lastRefresh)}
                </span>
              </CardDescription>
            </div>
            <Button 
              onClick={fetchStats} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats.rooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No forms found in the system.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <div className="space-y-3 p-3">
                {stats.rooms.slice(0, displayCount).map((room) => {
                  // Mock active users for demo - in real implementation, this would come from API
                  const mockActiveUsers = room.activeUsers > 0 ? [
                    {
                      userId: `user-${room.formId}-1`,
                      name: "User 1",
                      color: "#6366f1",
                      presenceKey: `presence-${room.formId}-1`,
                      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=User1"
                    },
                    ...(room.activeUsers > 1 ? [{
                      userId: `user-${room.formId}-2`,
                      name: "User 2", 
                      color: "#22c55e",
                      presenceKey: `presence-${room.formId}-2`,
                      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=User2"
                    }] : [])
                  ] : [];

                  return (
                  <div
                    key={room.formId}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{stripHtml(room.formTitle)}</h4>
                        {room.activeUsers > 0 && (
                          <Badge variant="default" className="h-5 px-1.5 text-xs">
                            {room.activeUsers} active
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                        <span>Slug: /f/{room.formSlug}</span>
                        <span className="hidden sm:inline">Opened {formatDistanceToNow(new Date(room.createdAt))}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {room.activeUsers > 0 ? (
                        <ActiveUsersDialog activeUsers={mockActiveUsers}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Active ({room.activeUsers})
                          </Button>
                        </ActiveUsersDialog>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          disabled
                        >
                          <Users className="h-3 w-3 mr-1" />
                          Active (0)
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/forms/${room.formId}/edit`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                  );
                })}
                
                {/* Load more indicator */}
                {displayCount < stats.rooms.length && (
                  <div 
                    ref={loadMoreRef}
                    className="text-center py-4 text-muted-foreground text-sm"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span>Loading more...</span>
                    </div>
                  </div>
                )}
                
                {/* Show remaining count */}
                {displayCount >= stats.rooms.length && stats.rooms.length > 5 && (
                  <div className="text-center py-2 text-xs text-muted-foreground">
                    Showing all {stats.rooms.length} rooms
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
