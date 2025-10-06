import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Test() {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectName: "",
    email: "",
    dateRange: "30",
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
            Analytics Dashboard Setup
          </h2>
          <p className="text-gray-600">
            Configure your marketing analytics integration
          </p>
        </div>

        <div className="space-y-6">
          \{" "}
          <div>
            <label
              htmlFor="projectName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Project Name
            </label>
            <input
              type="text"
              id="projectName"
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your project name"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="dateRange"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Default Date Range
            </label>
            <select
              id="dateRange"
              name="dateRange"
              value={formData.dateRange}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
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
                  <span className={`font-semibold`}>Meta Ads</span>
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
                  <span className={`font-semibold`}>Google Ads</span>
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

export default Test;
