"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import ProfileForm from "@/components/ProfileForm";
import { getProfile, saveProfile } from "@/lib/api";
import type { Profile, ProfileInput } from "@/lib/api";

export default function ProfilePage() {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const token = await getToken();
      getProfile(token)
        .then(setProfile)
        .catch(() => setProfile(null))
        .finally(() => setLoading(false));
    };
    load();
  }, [getToken]);

  async function handleSave(input: ProfileInput) {
    const token = await getToken();
    const saved = await saveProfile(input, token);
    setProfile(saved);
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading profile...</p>;
  }

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <p className="text-gray-500 text-sm mt-1">
          This is the candidate profile Claude uses to evaluate job fits.
        </p>
      </div>
      <ProfileForm
        initial={
          profile
            ? {
                name: profile.name,
                title: profile.title,
                years_experience: profile.years_experience,
                skills: profile.skills,
                experience_summary: profile.experience_summary,
              }
            : null
        }
        onSave={handleSave}
      />
    </div>
  );
}
