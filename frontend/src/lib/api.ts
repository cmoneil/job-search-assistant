const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Profile {
  id: number;
  name: string;
  title: string;
  years_experience: number;
  skills: string[];
  experience_summary: string;
  updated_at: string;
}

export interface ProfileInput {
  name: string;
  title: string;
  years_experience: number;
  skills: string[];
  experience_summary: string;
}

export interface StackMatch {
  matched_skills: string[];
  missing_skills: string[];
  bonus_skills: string[];
  score: number;
}

export interface ExperienceFit {
  required_years: number | null;
  seniority_level: string;
  fit_level: string;
  notes: string;
}

export interface Gap {
  area: string;
  description: string;
  severity: "critical" | "moderate" | "minor";
}

export interface Verdict {
  recommendation: "apply" | "consider" | "skip";
  confidence: number;
  summary: string;
  key_selling_points: string[];
}

export interface Analysis {
  id: number;
  job_description: string;
  stack_match: StackMatch;
  experience_fit: ExperienceFit;
  gaps: Gap[];
  verdict: Verdict;
  created_at: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Request failed");
  }
  return res.json();
}

export async function getProfile(): Promise<Profile | null> {
  return request<Profile | null>("/profile");
}

export async function saveProfile(profile: ProfileInput): Promise<Profile> {
  return request<Profile>("/profile", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export async function analyze(job_description: string): Promise<Analysis> {
  return request<Analysis>("/analyze", {
    method: "POST",
    body: JSON.stringify({ job_description }),
  });
}

export async function getAnalyses(): Promise<Analysis[]> {
  return request<Analysis[]>("/analyses");
}

export async function getAnalysis(id: number): Promise<Analysis> {
  return request<Analysis>(`/analyses/${id}`);
}

export async function parseResume(file: File): Promise<ProfileInput> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/profile/parse-resume`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Failed to parse resume");
  }
  return res.json();
}
