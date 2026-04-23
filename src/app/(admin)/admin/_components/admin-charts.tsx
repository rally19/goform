"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { cn } from "@/lib/utils";

const COLORS = ["#6366f1", "#10b981", "#f43f5e", "#f97316", "#8b5cf6", "#0ea5e9", "#f59e0b", "#64748b"];

const CustomXAxisTick = ({ x, y, payload }: any) => {
  const date = new Date(payload.value);
  const day = date.getDate();
  const month = date.getMonth() + 1;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="currentColor" className="fill-muted-foreground font-medium" style={{ fontSize: '10px' }}>
        {day}
      </text>
      <text x={0} y={0} dy={24} textAnchor="middle" fill="currentColor" className="fill-muted-foreground/60" style={{ fontSize: '8px' }}>
        {month}
      </text>
    </g>
  );
};

interface AdminChartsProps {
  timeSeries: {
    users: { date: string; count: number }[];
    responses: { date: string; count: number }[];
  };
  distributions: {
    roles: { name: string; value: number }[];
    statuses: { name: string; value: number }[];
  };
}

export function AdminCharts({ timeSeries, distributions }: AdminChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* User Signups Chart */}
        <Card className="border-border/60 overflow-hidden group hover:border-primary/20 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">User Signups</CardTitle>
            <CardDescription className="text-xs">New accounts (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries.users}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                  <XAxis 
                    dataKey="date" 
                    tick={<CustomXAxisTick />}
                    stroke="var(--muted-foreground)"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    stroke="var(--muted-foreground)" 
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)', 
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                    labelStyle={{ fontWeight: 'bold' }}
                    cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#6366f1" 
                    fillOpacity={1} 
                    fill="url(#colorUsers)" 
                    strokeWidth={2.5}
                    animationDuration={1500}
                    name="Signups"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Responses Chart */}
        <Card className="border-border/60 overflow-hidden group hover:border-primary/20 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Form Submissions</CardTitle>
            <CardDescription className="text-xs">New responses (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries.responses}>
                  <defs>
                    <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                  <XAxis 
                    dataKey="date" 
                    tick={<CustomXAxisTick />}
                    stroke="var(--muted-foreground)"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    stroke="var(--muted-foreground)" 
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)', 
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                    labelStyle={{ fontWeight: 'bold' }}
                    cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorResponses)" 
                    strokeWidth={2.5}
                    animationDuration={1500}
                    name="Responses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold">User Roles</CardTitle>
          <CardDescription className="text-xs">Account breakdown by role</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center justify-around gap-8 py-8">
          <div className="h-[200px] w-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributions.roles}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {distributions.roles.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    borderColor: 'var(--border)', 
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 w-full max-w-2xl gap-4">
            {distributions.roles.map((entry, index) => (
              <div key={entry.name} className="flex flex-col p-5 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{entry.name}</span>
                </div>
                <span className="text-3xl font-bold tabular-nums">{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
