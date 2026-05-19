"use client";

import { useState } from "react";
import Link from "next/link";
import { analyze } from "@/lib/api";
import type { Analysis } from "@/lib/api";
import AnalysisResult from "@/components/AnalysisResult";

export default function AnalyzePage() {
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobDescription.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const analysis = await analyze(jobDescription);
      setResult(analysis);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      if (msg.includes("Profile not set up")) {
        setError("profile_missing");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analyze a Job</h1>
        <p className="text-gray-500 text-sm mt-1">
          Paste a job description to get an AI-powered fit analysis against your profile.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          className="w-full border border-gray-300 rounded-lg p-4 text-sm min-h-48 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste the full job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          disabled={loading}
          required
        />
        <button
          type="submit"
          disabled={loading || !jobDescription.trim()}
          className="self-start bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-gray-500 py-4">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Running AI analysis — this takes about 15–30 seconds...
        </div>
      )}

      {error === "profile_missing" && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          You need to{" "}
          <Link href="/profile" className="underline font-medium">
            set up your profile
          </Link>{" "}
          before running an analysis.
        </div>
      )}

      {error && error !== "profile_missing" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && <AnalysisResult analysis={result} />}
    </div>
  );
}
