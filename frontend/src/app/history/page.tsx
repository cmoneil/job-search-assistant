"use client";

import { useEffect, useState } from "react";
import { getAnalyses } from "@/lib/api";
import type { Analysis } from "@/lib/api";
import AnalysisResult from "@/components/AnalysisResult";

const verdictBadge = {
  apply: "bg-green-100 text-green-800",
  consider: "bg-yellow-100 text-yellow-800",
  skip: "bg-red-100 text-red-800",
};

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    getAnalyses()
      .then(setAnalyses)
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading history...</p>;
  }

  if (analyses.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">History</h1>
        <p className="text-sm text-gray-500">No analyses yet. Go analyze a job description.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">History</h1>
      <ul className="flex flex-col gap-3">
        {analyses.map((a) => (
          <li key={a.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
              className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(expanded === a.id ? null : a.id)}
            >
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-sm text-gray-700 line-clamp-2 leading-snug">
                  {a.job_description.slice(0, 200)}
                  {a.job_description.length > 200 ? "..." : ""}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${verdictBadge[a.verdict.recommendation]}`}
                >
                  {a.verdict.recommendation}
                </span>
                <span className="text-gray-400 text-sm">{expanded === a.id ? "▲" : "▼"}</span>
              </div>
            </button>
            {expanded === a.id && (
              <div className="border-t border-gray-100 px-5 py-5">
                <AnalysisResult analysis={a} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
