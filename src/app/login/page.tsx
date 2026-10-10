"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import { APP_NAME, BRAND_EMAIL_DOMAIN } from "@/lib/brand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Login failed.");
      }

      toast.success("Welcome back.");
      router.push("/");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in right now.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--editorial-background)] px-4 py-12">
      <div className="w-full max-w-[420px] rounded-2xl border border-[var(--editorial-border)] bg-white p-8 shadow-[0_20px_50px_rgba(16,24,40,0.08)] sm:p-10">
        <div className="flex flex-col items-center text-center">
          <BrandLogo />
          <h1 className="mt-6 text-xl font-bold tracking-tight text-gray-900">
            Sign in to {APP_NAME}
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Enter your credentials to access your account
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          <div className="space-y-1.5">
            <label className="editorial-label text-xs">Email</label>
            <input
              autoComplete="email"
              className="editorial-input h-11"
              onChange={(event) => setEmail(event.target.value)}
              placeholder={`name@${BRAND_EMAIL_DOMAIN}`}
              required
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="editorial-label text-xs">Password</label>
            </div>
            <div className="relative">
              <input
                autoComplete="current-password"
                className="editorial-input h-11 pr-11"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--editorial-text-faint)] hover:text-[var(--editorial-text)] transition-colors"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            className="editorial-button-primary mt-2 h-11 w-full text-sm font-medium transition-all"
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
