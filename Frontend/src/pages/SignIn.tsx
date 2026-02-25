import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Zap,
  CheckCircle,
  Mail,
  ArrowRight,
} from "lucide-react";
import axios from "axios";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  // Get success message and prefilled email from navigation state
  const successMessage = location.state?.message;
  const prefilledEmail = location.state?.email;

  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(`${backendUrl}/auth/login`, {
        email: email,
      });
      console.log("OTP sent:", response.data);

      navigate("/verify-otp", {
        state: { email: email },
      });
    } catch (err: any) {
      console.error("Send OTP error:", err);
      if (err.response?.status === 403) {
        setError(err.response.data.detail);
      } else if (err.response?.status === 404) {
        setError("Email not found. Please sign up first.");
      } else {
        setError(
          err.response?.data?.detail || "Failed to send OTP. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Dark gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -z-10"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent -z-10"></div>

      {/* LEFT SIDE - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/20 animated-gradient"></div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-xl blur-xl opacity-50"></div>
              <div className="relative p-3 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-2xl">
                <Zap className="h-8 w-8 text-white" />
              </div>
            </div>
            <span className="text-3xl font-bold text-gradient">
              VIRALITY MEDIA
            </span>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl font-bold text-foreground mb-4 leading-tight">
                Welcome Back to Your
                <br />
                <span className="text-gradient">Analytics Hub</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Track and optimize your ad performance across all platforms
              </p>
            </div>

            {/* Features */}
            <div className="space-y-6">
              <div className="flex items-start gap-4 group">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Unified Dashboard
                  </h3>
                  <p className="text-muted-foreground">
                    All your metrics in one place
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="p-3 bg-secondary/10 rounded-xl group-hover:bg-secondary/20 transition-colors">
                  <TrendingUp className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Real-Time Data
                  </h3>
                  <p className="text-muted-foreground">
                    Stay updated with live insights
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="p-3 bg-secondary/10 rounded-xl group-hover:bg-secondary/20 transition-colors">
                  <Zap className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Smart Analytics
                  </h3>
                  <p className="text-muted-foreground">
                    Make data-driven decisions
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Icons */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-medium">
              INTEGRATED PLATFORMS
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-card/50 border border-border/50 rounded-lg backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-foreground">
                  Meta
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-card/50 border border-border/50 rounded-lg backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-foreground">
                  Google
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-card/50 border border-border/50 rounded-lg backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-foreground">
                  Shopify
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md bg-card/50 border-border/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            {/* Mobile Logo */}
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-xl blur-lg opacity-50"></div>
                <div className="relative p-2 bg-gradient-to-br from-primary to-secondary rounded-xl">
                  <Zap className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <CardTitle className="text-3xl font-bold text-foreground">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to access your analytics dashboard
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Success Message from SignUp */}
            {successMessage && (
              <div className="mb-6 bg-success/10 border border-success/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <p className="text-sm text-success font-medium">
                    {successMessage}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    required
                    className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 text-foreground"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  We'll send a verification code to your email
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-base shadow-lg shadow-primary/20"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending Code...</span>
                  </div>
                ) : (
                  <>
                    Continue with Email
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/signup")}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Sign Up
                  </button>
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-4">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Passwordless authentication with OTP
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignIn;
