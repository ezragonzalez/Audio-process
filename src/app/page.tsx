"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Mic } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else if (res.status === 429) {
        setError("Too many attempts. Please wait a minute.");
      } else {
        setError("Invalid password. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl glass-strong mb-6">
            <Mic className="w-10 h-10 text-purple-300" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-3">
            Zoom Transcription Studio
          </h1>
          <p className="text-white/50 text-lg">
            AI-powered meeting transcription & analysis
          </p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit}>
          <div className="glass rounded-3xl p-8 space-y-6">
            <div className="text-center">
              <Lock className="w-6 h-6 text-white/40 mx-auto mb-2" />
              <p className="text-white/60 text-sm">
                Enter your team password to continue
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter password"
                className="w-full px-5 py-4 rounded-2xl glass-input text-white placeholder-white/30 text-center text-lg tracking-widest"
                autoFocus
              />

              {error && (
                <p className="text-red-400/90 text-sm text-center animate-fade-in">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-4 rounded-2xl glass-button-primary text-white font-semibold text-lg
                           disabled:opacity-40 disabled:cursor-not-allowed
                           flex items-center justify-center gap-3"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Access Studio
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <p className="text-center text-white/20 text-xs mt-8">
          Transcription Studio by Ezra Gonzalez
        </p>
      </div>
    </div>
  );
}
