import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap, Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useGoogleLogin } from "@react-oauth/google";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const { toast } = useToast();

  const links = [
    { label: "How It Works", href: "#how-it-works" },
    { label: "AI Features", href: "#ai-features" },
    { label: "Pricing", href: "#pricing" },
  ];

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setShowAuth(true);
    setEmail("");
    setPassword("");
    setName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body = authMode === "login"
        ? { email, password }
        : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");

      localStorage.setItem("token", data.access_token);
      setUser(data.user);
      setShowAuth(false);
      toast({
        title: authMode === "login"
          ? `Welcome back, ${data.user.name}! 👋`
          : `Account created! Welcome, ${data.user.name}! 🎉`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        const userInfo = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then((r) => r.json());

        let res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: userInfo.name,
            email: userInfo.email,
            password: userInfo.sub,
          }),
        });

        if (res.status === 400) {
          res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: userInfo.email,
              password: userInfo.sub,
            }),
          });
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Google login failed");

        localStorage.setItem("token", data.access_token);
        setUser(data.user);
        setShowAuth(false);
        toast({ title: `Welcome, ${data.user.name}! 👋` });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Google login failed";
        toast({ title: "Google login failed", description: message, variant: "destructive" });
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast({ title: "Google login failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    toast({ title: "Logged out successfully" });
  };

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 glass-strong"
      >
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              PaySplit<span className="text-primary"> AI</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {user.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{user.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>Log Out</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => openAuth("login")}>Log In</Button>
                <Button size="sm" onClick={() => openAuth("signup")}>Get Started</Button>
              </>
            )}
          </div>

          <button className="text-foreground md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border md:hidden"
            >
              <div className="flex flex-col gap-4 px-6 py-6">
                {links.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </a>
                ))}
                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" size="sm" className="flex-1"
                    onClick={() => { setMobileOpen(false); openAuth("login"); }}>
                    Log In
                  </Button>
                  <Button size="sm" className="flex-1"
                    onClick={() => { setMobileOpen(false); openAuth("signup"); }}>
                    Sign Up
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
            >
              <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />

              <div className="p-8">
                <button onClick={() => setShowAuth(false)}
                  className="absolute right-5 top-5 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>

                <div className="mb-6 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                    <Zap className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-display text-lg font-bold">PaySplit AI</span>
                </div>

                <div className="mb-6 flex rounded-xl border border-border bg-secondary/30 p-1">
                  {(["login", "signup"] as const).map((mode) => (
                    <button key={mode} onClick={() => setAuthMode(mode)}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                        authMode === mode
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}>
                      {mode === "login" ? "Log In" : "Sign Up"}
                    </button>
                  ))}
                </div>

                <h2 className="font-display text-2xl font-bold">
                  {authMode === "login" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {authMode === "login"
                    ? "Sign in to access your PaySplit dashboard"
                    : "Start splitting payments smarter today"}
                </p>

                {/* Google only */}
                <div className="mt-6">
                  <button
                    onClick={() => googleLogin()}
                    disabled={googleLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary/60 disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    {googleLoading ? "Connecting..." : "Continue with Google"}
                  </button>
                </div>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or continue with email</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {authMode === "signup" && (
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="Full name" required
                        className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address" required
                      className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password" required
                      className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-11 pr-11 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {authMode === "login" && (
                    <div className="text-right -mt-2">
                      <button type="button" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button type="submit" size="lg" className="mt-1 w-full gap-2" disabled={loading}>
                    {loading
                      ? <><Loader2 className="h-4 w-4 animate-spin" />{authMode === "login" ? "Logging in..." : "Creating account..."}</>
                      : authMode === "login" ? "Log In" : "Create Account"
                    }
                  </Button>
                </form>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                  {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
                  <button onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                    className="font-medium text-primary hover:underline">
                    {authMode === "login" ? "Sign up free" : "Log in"}
                  </button>
                </p>

                {authMode === "signup" && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    By signing up, you agree to our{" "}
                    <a href="#" className="text-primary hover:underline">Terms</a> and{" "}
                    <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;