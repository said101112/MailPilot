"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

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
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || "Login failed")
      }

      toast.success("Welcome back")
      router.push("/")
      router.refresh()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in right now"
      toast.error(message)
    }

    setLoading(false)
  }

  return (
    <div className="h-screen w-full flex items-center justify-center p-4 bg-[#0A0F1C] overflow-hidden relative">
      {/* Subtle background glow for visibility */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[400px] flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-[#111827] border border-[#1F2937] shadow-xl">
            <ShieldCheck className="w-8 h-8 text-[#3B82F6]" />
          </div>
          <div className="text-center flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-[#F9FAFB] tracking-tight">TruckApply</h1>
            <p className="text-sm font-medium text-[#9CA3AF]">Enter your credentials to access the portal</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="saas-card rounded-2xl p-8 flex flex-col gap-6 border-[#1F2937] bg-[#111827]/80 backdrop-blur-sm">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#F9FAFB] ml-1" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-saas-minimal w-full px-4 py-3 rounded-xl text-sm"
                placeholder="name@company.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-sm font-semibold text-[#F9FAFB]" htmlFor="password">
                  Password
                </label>
                <button type="button" className="text-xs font-medium text-[#3B82F6] hover:text-[#60A5FA] transition-colors">
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-saas-minimal w-full px-4 py-3 rounded-xl text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              disabled={loading}
              className="btn-saas-primary w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-transform"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center">
          <p className="text-xs font-medium text-[#4B5563]">
            &copy; 2026 TruckApply Inc. &bull; Secure Enterprise Portal
          </p>
        </div>
      </div>
    </div>
  )
}
