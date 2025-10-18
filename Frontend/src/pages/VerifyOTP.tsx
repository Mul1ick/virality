import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

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

  const email = location.state?.email || "";

  useEffect(() => {
    // Auto-focus first input ONLY on initial mount
    if (inputRefs.current[0] && !hasAutoFocused.current) {
      inputRefs.current[0].focus();
      hasAutoFocused.current = true;
    }
  }, []); // Empty dependency array - runs only once

  useEffect(() => {
    // Separate effect for timer countdown
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
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

    // Focus last filled input
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

    // Simulate OTP verification - redirect to signin after 1 second
    setTimeout(() => {
      console.log("OTP verified (simulated):", otpCode);

      navigate("/signin", {
        state: { message: "Email verified successfully! Please sign in." },
      });

      setIsLoading(false);
    }, 1000);

    /* Uncomment when backend is ready:
    try {
      const response = await axios.post(`${backendUrl}/auth/verify-otp`, {
        email: email,
        otp: otpCode,
      });

      console.log("OTP verification successful:", response.data);

      navigate("/signin", {
        state: { message: "Email verified successfully! Please sign in." },
      });
    } catch (err) {
      console.error("OTP verification error:", err);
      setError(err.response?.data?.detail || "Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
    */
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setError("");

    // Simulate resend - show success after 1 second
    setTimeout(() => {
      setResendSuccess(true);
      setTimer(60); // Reset timer
      setResendLoading(false);

      setTimeout(() => {
        setResendSuccess(false);
      }, 3000);
    }, 1000);

    /* Uncomment when backend is ready:
    try {
      await axios.post(`${backendUrl}/auth/resend-otp`, {
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
    */
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl inline-block mb-6">
            <Mail className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Check Your Email
          </h1>
          <p className="text-white/90 text-lg mb-6">
            We've sent a 6-digit verification code to your email address. Enter
            it below to verify your account.
          </p>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <p className="text-white/80 text-sm mb-2">Verifying for:</p>
            <p className="text-white font-semibold">{email}</p>
          </div>
        </div>
      </div>

      {/* Right Side - OTP Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden mb-8">
            <div className="p-3 bg-primary/10 rounded-xl inline-block mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Verify Your Email
            </h2>
            <p className="text-muted-foreground text-sm">
              Enter the 6-digit code sent to{" "}
              <span className="font-medium">{email}</span>
            </p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block mb-8">
            <button
              onClick={() => navigate("/signup")}
              className="flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign Up
            </button>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Enter Verification Code
            </h2>
            <p className="text-muted-foreground">We sent a code to {email}</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            {/* OTP Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-4">
                Verification Code
              </label>
              <div className="flex gap-3 justify-between">
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
                    className="w-14 h-14 text-center text-2xl font-bold bg-card text-foreground border-2 border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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
              className="w-full py-6 text-base font-semibold"
            >
              {isLoading ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          {/* Resend OTP */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Didn't receive the code?
            </p>
            {timer > 0 ? (
              <p className="text-sm text-muted-foreground">
                Resend code in{" "}
                <span className="font-semibold text-foreground">{timer}s</span>
              </p>
            ) : (
              <button
                onClick={handleResendOTP}
                disabled={resendLoading}
                className="text-sm text-primary hover:text-primary/80 font-semibold hover:underline transition-colors disabled:opacity-50"
              >
                {resendLoading ? "Sending..." : "Resend Code"}
              </button>
            )}
          </div>

          {/* Mobile Back Button */}
          <div className="lg:hidden mt-8 pt-6 border-t border-border">
            <button
              onClick={() => navigate("/signup")}
              className="flex items-center justify-center w-full text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyOTP;
