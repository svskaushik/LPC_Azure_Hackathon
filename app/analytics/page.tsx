"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  CartesianGrid,
  Legend,
  ReferenceArea,
} from "recharts";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";

interface RecordItem {
  id: string;
  timestamps: { createdAt: string };
  gradingResults: { combinedGrade: number; confidenceScore: number };
  qualityControl: { reviewStatus: string; technicianCombinedGrade?: number };
}

// Spinner component that matches the app style
function Spinner({ size = "medium" }: { size?: "small" | "medium" | "large" }) {
  const sizeClasses = {
    small: "h-5 w-5",
    medium: "h-8 w-8",
    large: "h-10 w-10",
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]}`}>
      <RefreshCw className="h-full w-full text-blue-600 dark:text-blue-400" />
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        const res = await fetch('/api/technician-grade?limit=1000');
        if (!res.ok) throw new Error('Failed to load data');
        const json = await res.json();
        setData(json.records);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Prepare chart data
  const chartData = data
    .map(item => ({
      time: format(new Date(item.timestamps.createdAt), 'HH:mm'),
      AI_Score: item.gradingResults.combinedGrade,
      Tech_Score: item.qualityControl.technicianCombinedGrade ?? null,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center p-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/50 shadow-md max-w-md">
        <Spinner size="large" />
        <p className="mt-4 text-blue-700 dark:text-blue-300 font-medium text-lg">Loading analytics dashboard...</p>
        <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mt-2">Fetching and processing potato quality data</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg shadow-md">
      <p className="text-red-700 dark:text-red-400 font-medium">Error loading analytics: {error}</p>
      <p className="text-sm text-red-600 dark:text-red-300 mt-2">Please try again later or contact support.</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Only keep main content and footer, navbar is now in layout.tsx */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>

          <section className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">AI vs Technician Scores Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTech" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" />
                <YAxis domain={[0, 10]} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="AI_Score" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAi)" />
                <Area
                  type="monotone"
                  dataKey="Tech_Score"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorTech)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <section className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Confidence Score Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.map(item => ({
                time: format(new Date(item.timestamps.createdAt), 'HH:mm'),
                Confidence: item.gradingResults.confidenceScore * 100,
              }))}>
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="Confidence"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#colorConf)"
                />
                <defs>
                  <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <section className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Match Rate Over Time</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.map(item => ({
                time: format(new Date(item.timestamps.createdAt), 'HH:mm'),
                Match: item.gradingResults.combinedGrade === item.qualityControl.technicianCombinedGrade ? 1 : 0,
              }))}>
                <XAxis dataKey="time" />
                <YAxis domain={[0, 1]} ticks={[0, 1]} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip formatter={(value) => (value === 1 ? 'Matched' : 'Unmatched')} />
                <Area
                  type="monotone"
                  dataKey="Match"
                  stroke="#ef4444"
                  fillOpacity={0.5}
                  fill="#ef4444"
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>
        </div>
      </main>
      <footer className="bg-white dark:bg-zinc-800 border-t border-gray-200 dark:border-zinc-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Potato Quality Grader - LPC
          </p>
        </div>
      </footer>
    </div>
  );
}
