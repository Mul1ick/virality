import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { BarChart3, TrendingUp, Target, CheckCircle } from "lucide-react";
import axios from "axios"; // 👈 Import axios


function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";


  // Get success message from navigation state
  const successMessage = location.state?.message;
  const prefilledEmail = location.state?.email;

  useEffect(() => {
    // Prefill email if coming from signup
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    // Your existing validation logic
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

    // ✅ UNCOMMENT THIS BLOCK
    try {
      // This endpoint now sends the OTP
      const response = await axios.post(`${backendUrl}/auth/login`, {
        email: email,
      });
      console.log("OTP sent:", response.data);

      // Redirect to OTP verification
      navigate("/verify-otp", {
        state: { email: email }
      });
    } catch (err: any) {
      console.error("Send OTP error:", err);
      if (err.response?.status === 403) {
        // This will now catch "pending approval" or "rejected"
        setError(err.response.data.detail);
      } else if (err.response?.status === 404) { 
        setError("Email not found. Please sign up first.");
      } else {
        setError(err.response?.data?.detail || "Failed to send OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-foreground rounded-full flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-8 h-8" fill="white">
                <path
                  d="M30 70 L50 50 L70 70 M50 50 L70 30 M50 50 Q80 50 80 20"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">
              VIRALITY MEDIA
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              Welcome Back to Your Analytics Hub
            </h1>
            <p className="text-white/90 text-lg">
              Track and optimize your ad performance across all platforms
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Unified Dashboard
                </h3>
                <p className="text-white/80 text-sm">
                  All your metrics in one place
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Real-Time Data
                </h3>
                <p className="text-white/80 text-sm">
                  Stay updated with live insights
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Smart Analytics
                </h3>
                <p className="text-white/80 text-sm">
                  Make data-driven decisions
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-lg font-semibold text-white mb-1">Meta</div>
            <div className="text-white/80 text-sm">Facebook & Instagram</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-white mb-1">Google</div>
            <div className="text-white/80 text-sm">Ads & Analytics</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-white mb-1">Shopify</div>
            <div className="text-white/80 text-sm">E-commerce Data</div>
          </div>
        </div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">
              VIRALITY MEDIA
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Welcome Back
            </h2>
            <p className="text-muted-foreground">
              Sign in to access your analytics dashboard
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-success/10 border border-success/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <p className="text-sm text-success">{successMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="w-full px-4 py-3 bg-card text-foreground border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="you@company.com"
                required
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Info Message */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
              <p className="text-sm text-foreground font-medium">
                We'll send a verification code to your email
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? "Sending Code..." : "Continue with Email"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-primary hover:text-primary/80 font-semibold hover:underline transition-colors"
              >
                Sign Up
              </button>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Passwordless authentication with OTP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
