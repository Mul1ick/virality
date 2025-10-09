import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function SignUp() {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      window.location.href = "http://127.0.0.1:8000/google/login";
    } catch (error) {
      console.error("Error fetching Google login URL:", error);
    }
  };

  const handleMetaLogin = async () => {
    setIsLoading(true);
    try {
      // const response = await axios.get("http://127.0.0.1:8000/meta/login");
      // also a get request, but its an AJAX call (stays on same page) -> not ideal for oauth
      window.location.href = "http://127.0.0.1:8000/meta/login";
    } catch (error) {
      console.error("Error fetching Meta login URL:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Account Setup
          </h2>
          <p className="text-gray-600">
            Configure your marketing analytics integration
          </p>
        </div>

        <div className="space-y-6">
          \{" "}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              type="text"
              id="projectName"
              name="projectName"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>
          <div className="mt-4">
            <Button
              onClick={() => {
                console.log("Sign Up clicked", formData);
                // You can add actual sign up logic here
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Sign Up
            </Button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Advertising Platforms
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  handleMetaLogin();
                }}
                className={`p-6 rounded-lg border-2 transition-all`}
              >
                <div className="flex flex-col items-center">
                  <div className={`text-4xl mb-2`}>📘</div>
                  <span className={`font-semibold text-blue-700`}>
                    Meta Ads
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleGoogleLogin();
                }}
                className={`p-6 rounded-lg border-2 transition-all`}
              >
                <div className="flex flex-col items-center">
                  <div className={`text-4xl mb-2`}>🔍</div>
                  <span className={`font-semibold text-blue-700`}>
                    Google Ads
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Your login credentials will be requested in the next step
        </div>
      </div>
    </div>
  );
}

export default SignUp;
