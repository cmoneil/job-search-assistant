import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Job Fit Analyzer",
  description: "Analyze job descriptions against your profile with AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} bg-gray-50 min-h-screen`}>
          <Nav />
          <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
