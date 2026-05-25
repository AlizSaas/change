import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { siGoogle } from "simple-icons";

import { useState } from "react";
import { authClient } from "./client";

type View = "signin" | "signup" | "forgot";

interface LoginPopupProps {
  children: React.ReactNode;
}

export function LoginPopup({ children }: LoginPopupProps) {
  const [view, setView] = useState<View>("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setSuccess(null);
    setEmail("");
    setPassword("");
    setName("");
  };

  const switchView = (v: View) => {
    reset();
    setView(v);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    await authClient.signIn.social({ provider: "google", callbackURL: "/app" });
    setLoading(false);
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password, callbackURL: "/app" });
    if (error) setError(error.message ?? "Sign in failed");
    setLoading(false);
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await authClient.signUp.email({ email, password, name, callbackURL: "/app" });
    if (error) setError(error.message ?? "Sign up failed");
    setLoading(false);
  };

  const forgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await authClient.forgetPassword({ email, redirectTo: "/reset-password" });
    if (error) setError(error.message ?? "Failed to send reset email");
    else setSuccess("Reset link sent — check your inbox");
    setLoading(false);
  };

  return (
    <Dialog onOpenChange={() => switchView("signin")}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-1">
          <DialogTitle className="text-2xl font-bold">
            {view === "signin" && "Sign in"}
            {view === "signup" && "Create account"}
            {view === "forgot" && "Reset password"}
          </DialogTitle>
          <p className="text-muted-foreground text-sm">
            {view === "signin" && "Welcome back"}
            {view === "signup" && "Get started for free"}
            {view === "forgot" && "We'll email you a reset link"}
          </p>
        </DialogHeader>

        {/* Google button — only on sign in / sign up */}
        {view !== "forgot" && (
          <>
            <Button
              onClick={signInWithGoogle}
              variant="outline"
              className="w-full h-11 font-medium"
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d={siGoogle.path} />
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>
          </>
        )}

        {/* Sign In form */}
        {view === "signin" && (
          <form onSubmit={signIn} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" onClick={() => switchView("forgot")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Forgot password?
                </button>
              </div>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : "Sign in"}
            </Button>
          </form>
        )}

        {/* Sign Up form */}
        {view === "signup" && (
          <form onSubmit={signUp} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : "Create account"}
            </Button>
          </form>
        )}

        {/* Forgot Password form */}
        {view === "forgot" && (
          <form onSubmit={forgotPassword} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : "Send reset link"}
            </Button>
            <button type="button" onClick={() => switchView("signin")} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to sign in
            </button>
          </form>
        )}

        {/* Toggle sign in / sign up */}
        {view !== "forgot" && (
          <p className="text-center text-sm text-muted-foreground">
            {view === "signin" ? (
              <>Don't have an account?{" "}
                <button onClick={() => switchView("signup")} className="font-medium text-foreground hover:underline">Sign up</button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => switchView("signin")} className="font-medium text-foreground hover:underline">Sign in</button>
              </>
            )}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}


