import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Target } from "lucide-react";

function SignUp() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Email is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate checking email uniqueness - redirect to signin after 1 second
    setTimeout(() => {
      console.log("Email registered (simulated):", email);

      // Redirect to sign in page with success message
      navigate("/signin", {
        state: {
          message: "Account created! Please sign in to continue.",
          email: email,
        },
      });

      setIsLoading(false);
    }, 1000);

    /* Uncomment when backend is ready:
    try {
      const response = await axios.post(`${backendUrl}/auth/register`, {
        email: email,
      });

      console.log("Sign up successful:", response.data);
      
      navigate("/signin", {
        state: { 
          message: "Account created! Please sign in to continue.",
          email: email 
        }
      });
    } catch (err: any) {
      console.error("Sign up error:", err);
      if (err.response?.status === 409) {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError(err.response?.data?.detail || "Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
    */
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        {/* Logo */}
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

        {/* Value Props */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              Unified Analytics Dashboard
            </h1>
            <p className="text-white/90 text-lg">
              Track and optimize your ad performance across all platforms in one
              place
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Unified Metrics
                </h3>
                <p className="text-white/80 text-sm">
                  All your ad platforms in a single dashboard
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Real-Time Insights
                </h3>
                <p className="text-white/80 text-sm">
                  Make data-driven decisions faster
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Performance Tracking
                </h3>
                <p className="text-white/80 text-sm">
                  Monitor ROAS, CPA, and revenue trends
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
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

      {/* Right Side - Sign Up Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
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
              Create Your Account
            </h2>
            <p className="text-muted-foreground">
              Enter your email to get started with analytics
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            {/* Email Input */}
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

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Info Message */}
            {/* <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
              <p className="text-sm text-primary">
                You'll set your password on the next step
              </p>
            </div> */}

            {/* Sign Up Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? "Creating Account..." : "Continue"}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/signin")}
                className="text-primary hover:text-primary/80 font-semibold hover:underline transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>

          {/* Trust Badge */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
              <svg
                className="w-4 h-4 text-success"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Secure and privacy-focused</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
