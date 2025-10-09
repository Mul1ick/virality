import { useState } from "react";
import { Button } from "@/components/ui/button";

function Test() {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [formData, setFormData] = useState({
    projectName: "",
    email: "",
    dateRange: "30",
  });

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSubmit = () => {
    if (selectedPlatforms.length === 0) {
      alert("Please select at least one platform");
      return;
    }
  };

  const handleInputChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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
                onClick={() => togglePlatform("Meta")}
                className={`p-6 rounded-lg border-2 transition-all ${
                  selectedPlatforms.includes("Meta")
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`text-4xl mb-2 ${
                      selectedPlatforms.includes("Meta")
                        ? "opacity-100"
                        : "opacity-60"
                    }`}
                  >
                    📘
                  </div>
                  <span
                    className={`font-semibold ${
                      selectedPlatforms.includes("Meta")
                        ? "text-blue-700"
                        : "text-gray-700"
                    }`}
                  >
                    Meta Ads
                  </span>
                  {selectedPlatforms.includes("Meta") && (
                    <span className="text-xs text-blue-600 mt-1">
                      ✓ Selected
                    </span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => togglePlatform("Google")}
                className={`p-6 rounded-lg border-2 transition-all ${
                  selectedPlatforms.includes("Google")
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`text-4xl mb-2 ${
                      selectedPlatforms.includes("Google")
                        ? "opacity-100"
                        : "opacity-60"
                    }`}
                  >
                    🔍
                  </div>
                  <span
                    className={`font-semibold ${
                      selectedPlatforms.includes("Google")
                        ? "text-blue-700"
                        : "text-gray-700"
                    }`}
                  >
                    Google Ads
                  </span>
                  {selectedPlatforms.includes("Google") && (
                    <span className="text-xs  text-blue-600 mt-1">
                      ✓ Selected
                    </span>
                  )}
                </div>
              </button>
            </div>
            {selectedPlatforms.length === 0 && (
              <p className="text-sm text-red-600 mt-2">
                Please select at least one platform
              </p>
            )}
          </div>
          {/* Submit Button */}
          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={selectedPlatforms.length === 0}
              className="w-full py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Your API credentials will be requested in the next step
        </div>
      </div>
    </div>
  );
}

export default Test;
