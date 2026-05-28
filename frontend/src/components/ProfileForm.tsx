"use client";

import { useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ProfileInput, parseResume } from "@/lib/api";

interface Props {
  initial: ProfileInput | null;
  onSave: (profile: ProfileInput) => Promise<void>;
}

export default function ProfileForm({ initial, onSave }: Props) {
  const { getToken } = useAuth();
  const [form, setForm] = useState<ProfileInput>(
    initial ?? {
      name: "",
      title: "",
      years_experience: 0,
      skills: [],
      experience_summary: "",
    }
  );
  const [skillsRaw, setSkillsRaw] = useState(initial?.skills.join(", ") ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleResumeParse(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setError(null);
    try {
      const token = await getToken();
      const parsed = await parseResume(file, token);
      setForm(parsed);
      setSkillsRaw(parsed.skills.join(", "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse resume");
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const skills = skillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await onSave({ ...form, skills });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function field(label: string, children: React.ReactNode) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {children}
      </div>
    );
  }

  const inputClass =
    "border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={handleResumeParse}
        />
        <button
          type="button"
          disabled={parsing}
          onClick={() => fileRef.current?.click()}
          className="self-start border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {parsing ? "Parsing resume..." : "Upload resume to auto-fill"}
        </button>
        <p className="text-xs text-gray-400">PDF or plain text. Fields will be pre-filled — review before saving.</p>
      </div>

      <hr className="border-gray-200" />

      {field(
        "Name",
        <input
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      )}
      {field(
        "Current Title",
        <input
          className={inputClass}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
      )}
      {field(
        "Years of Experience",
        <input
          type="number"
          min={0}
          className={inputClass}
          value={form.years_experience}
          onChange={(e) =>
            setForm({ ...form, years_experience: parseInt(e.target.value) || 0 })
          }
          required
        />
      )}
      {field(
        "Skills (comma-separated)",
        <input
          className={inputClass}
          placeholder="Python, React, PostgreSQL, Docker..."
          value={skillsRaw}
          onChange={(e) => setSkillsRaw(e.target.value)}
          required
        />
      )}
      {field(
        "Experience Summary",
        <textarea
          className={`${inputClass} resize-none h-32`}
          placeholder="Brief overview of your background, domains, and notable experience..."
          value={form.experience_summary}
          onChange={(e) => setForm({ ...form, experience_summary: e.target.value })}
          required
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="self-start bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Profile"}
      </button>
    </form>
  );
}
