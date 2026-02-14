import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Flower2 } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setError("");
        setIsSignup(false);
        // After signup, auto-sign in
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError("Account created! Please log in. (You need admin role to access the dashboard)");
        } else {
          navigate("/admin/dashboard");
        }
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        setError(error);
      } else {
        navigate("/admin/dashboard");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader className="flex flex-col items-center gap-3 pb-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Flower2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-brown">Vinayaka Pooja Flowers</h1>
          <p className="text-sm text-muted-foreground">Admin Portal</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-brown">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-brown">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-background"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-saffron-dark text-primary-foreground font-semibold"
            >
              {loading ? "Please wait..." : isSignup ? "Create Account" : "Login"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isSignup ? "Already have an account?" : "Need an account?"}{" "}
              <button type="button" onClick={() => { setIsSignup(!isSignup); setError(""); }} className="text-primary hover:underline">
                {isSignup ? "Login" : "Sign Up"}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
