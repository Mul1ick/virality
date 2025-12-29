import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle, Zap, Shield } from "lucide-react";
import axios from "axios";

function VerifyOTP() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const hasAutoFocused = useRef(false);
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  const email = location.state?.email || "";

  useEffect(() => {
    if (inputRefs.current[0] && !hasAutoFocused.current) {
      inputRefs.current[0].focus();
      hasAutoFocused.current = true;
    }
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);

    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, index) => {
      if (index < 6) {
        newOtp[index] = char;
      }
    });
    setOtp(newOtp);

    const lastFilledIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(`${backendUrl}/auth/verify-otp`, {
        email: email,
        otp: otpCode,
      });
      console.log("OTP verification successful:", response.data);

      localStorage.clear();
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("user_id", response.data.user_id);
      localStorage.setItem("isAdmin", response.data.isAdmin ? "true" : "false");

      navigate("/profile");
    } catch (err) {
      console.error("OTP verification error:", err);
      setError(err.response?.data?.detail || "Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setError("");

    try {
      await axios.post(`${backendUrl}/auth/login`, {
        email: email,
      });
      setResendSuccess(true);
      setTimer(60);

      setTimeout(() => {
        setResendSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Resend OTP error:", err);
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
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

        <div className="relative z-10 flex flex-col justify-center p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
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
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 border border-primary/20">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-semibold">
                Secure Verification
              </span>
            </div>

            <div>
              <h1 className="text-5xl font-bold text-foreground mb-4 leading-tight">
                Check Your
                <br />
                <span className="text-gradient">Email</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                We've sent a 6-digit verification code to your email address.
                Enter it below to verify your account.
              </p>
            </div>

            {/* Email Display Card */}
            <div className="bg-card/50 border border-border/50 rounded-xl p-6 backdrop-blur-sm">
              <p className="text-sm text-muted-foreground mb-2">
                Verifying for:
              </p>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <p className="text-foreground font-semibold text-lg">{email}</p>
              </div>
            </div>

            {/* Security Info */}
            <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-foreground font-medium mb-1">
                  Security Note
                </p>
                <p className="text-sm text-muted-foreground">
                  Your code expires in 10 minutes. Never share this code with
                  anyone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - OTP Form */}
      <div className="flex-1 flex items-center justify-center p-8">
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

            {/* Back Button */}
            <button
              onClick={() => navigate("/signin")}
              className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </button>

            <CardTitle className="text-3xl font-bold text-foreground">
              Enter Verification Code
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              We sent a code to{" "}
              <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleVerify} className="space-y-6">
              {/* OTP Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-4">
                  Verification Code
                </label>
                <div className="flex gap-2 justify-between">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className="w-12 h-14 text-center text-2xl font-bold bg-background/50 text-foreground border-2 border-border/50 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:opacity-50"
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Success Message for Resend */}
              {resendSuccess && (
                <div className="bg-success/10 border border-success/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <p className="text-sm text-success">
                      New code sent successfully!
                    </p>
                  </div>
                </div>
              )}

              {/* Verify Button */}
              <Button
                type="submit"
                disabled={isLoading || otp.some((d) => !d)}
                className="w-full h-12 text-base shadow-lg shadow-primary/20"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify Email"
                )}
              </Button>

              {/* Resend OTP */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?
                </p>
                {timer > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend code in{" "}
                    <span className="font-semibold text-foreground">
                      {timer}s
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendLoading}
                    className="text-sm text-primary hover:text-primary/80 font-medium hover:underline transition-colors disabled:opacity-50"
                  >
                    {resendLoading ? "Sending..." : "Resend Code"}
                  </button>
                )}
              </div>

              {/* Security Note */}
              <div className="flex items-center justify-center gap-2 pt-4">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Code expires in 10 minutes
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VerifyOTP;
