"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

const links = [
  { href: "/", label: "Analyze" },
  { href: "/profile", label: "Profile" },
  { href: "/history", label: "History" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 flex items-center gap-6 h-14">
        <span className="font-semibold text-gray-900 mr-4">Job Fit</span>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium transition-colors ${
              pathname === href
                ? "text-blue-600 border-b-2 border-blue-600 pb-0.5"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {label}
          </Link>
        ))}
        <div className="ml-auto">
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
}
