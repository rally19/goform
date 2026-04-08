"use client";

import type { Form } from "@/db/schema";
import type { FormAnalytics, FieldStat } from "@/lib/form-types";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell, PieChart, Pie,
} from "recharts";
import {
  Users, Clock, TrendingUp, Star, BarChart2, CheckSquare,
  Type, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#6366f1", "#8b5cf6", "#f43f5e", "#f97316", "#10b981", "#0ea5e9", "#f59e0b", "#64748b"];

function StatCard({ title, value, subtitle, icon: Icon, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        {trend && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ChoiceFieldChart({ stat, accentColor }: { stat: FieldStat; accentColor: string }) {
  const data = stat.optionCounts ?? [];
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
        </div>
        <CardDescription>{stat.responseCount} responses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((item, i) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="truncate text-foreground">{item.label}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">{item.count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  />
                </div>
              </div>
            );
          })}
          {data.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No responses yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RatingChart({ stat, accentColor }: { stat: FieldStat; accentColor: string }) {
  const dist = stat.distribution ?? [];
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
        </div>
        <CardDescription>
          Average: {stat.average ?? "—"} · {stat.responseCount} responses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dist.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={dist} barSize={24}>
              <XAxis dataKey="value" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} fill={accentColor} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">No responses yet</p>
        )}
      </CardContent>
    </Card>
  );
}

function TextFieldStat({ stat }: { stat: FieldStat }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
        </div>
        <CardDescription>{stat.responseCount} responses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          <div>
            <div className="text-2xl font-bold">{stat.responseCount}</div>
            <p className="text-xs text-muted-foreground">Filled</p>
          </div>
          {stat.avgLength !== undefined && (
            <div>
              <div className="text-2xl font-bold">{stat.avgLength}</div>
              <p className="text-xs text-muted-foreground">Avg chars</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AnalyticsDashboardProps {
  formId: string;
  form: Form;
  analytics: FormAnalytics | null;
}

export function AnalyticsDashboard({ formId, form, analytics }: AnalyticsDashboardProps) {
  const accentColor = form.accentColor ?? "#6366f1";

  if (!analytics || analytics.totalResponses === 0) {
    return (
      <div className="p-4 pt-6 md:p-8 space-y-6 overflow-y-auto h-full">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Share your form to start collecting responses
          </p>
        </div>
        <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-16 text-center">
          <BarChart2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">No responses yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Analytics will appear here once people start submitting your form.
          </p>
          <div className="mt-4 flex flex-col items-center gap-1">
            <p className="text-xs text-muted-foreground">Your public form URL:</p>
            <code className="text-xs bg-muted px-3 py-1.5 rounded-md border">
              {typeof window !== "undefined" ? window.location.origin : ""}/f/{form.slug}
            </code>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  return (
    <div className="p-4 pt-6 md:p-8 space-y-6 overflow-y-auto h-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          {form.title}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Responses"
          value={analytics.totalResponses.toLocaleString()}
          icon={Users}
          subtitle="All time submissions"
        />
        <StatCard
          title="Avg. Time to Complete"
          value={analytics.avgTimeTaken > 0 ? formatTime(analytics.avgTimeTaken) : "—"}
          icon={Clock}
          subtitle="Per submission"
        />
        <StatCard
          title="Status"
          value={form.status === "active" ? "Accepting" : "Closed"}
          icon={TrendingUp}
          subtitle={form.acceptResponses ? "Form is live" : "Closed to responses"}
        />
      </div>

      {/* Responses over time */}
      {analytics.responsesOverTime.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Responses Over Time</CardTitle>
            <CardDescription>Daily submissions for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.responsesOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d) => {
                    const date = new Date(d);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(l) => new Date(l).toLocaleDateString()}
                  formatter={(v) => [v, "Responses"]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={accentColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: accentColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-field stats */}
      {analytics.fieldStats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider mb-3">
            Field Breakdown
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {analytics.fieldStats.map((stat) => {
              if (["radio", "checkbox", "select", "multi_select"].includes(stat.type)) {
                return <ChoiceFieldChart key={stat.fieldId} stat={stat} accentColor={accentColor} />;
              }
              if (["rating", "scale"].includes(stat.type)) {
                return <RatingChart key={stat.fieldId} stat={stat} accentColor={accentColor} />;
              }
              return <TextFieldStat key={stat.fieldId} stat={stat} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
