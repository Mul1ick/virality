import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  User,
  Facebook,
  GanttChart,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Link,
  ArrowRight,
  BarChart3,
  LogOut,
  Mail,
  Hash,
  Sparkles,
  UserCheck, // <-- Add this line
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface UserProfileData {
  id: string;
  name: string;
  email: string;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const getStatusBadge = (status) => {
  if (status === "Connected") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
        <CheckCircle className="h-3.5 w-3.5" />
        Connected
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
      <AlertCircle className="h-3.5 w-3.5" />
      Not Connected
    </div>
  );
};

const IntegrationCard = ({ integration, onConnect, isLoading }) => (
  <Card className="border-2 hover:border-primary/50 transition-all duration-200 hover:shadow-md">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-xl bg-gradient-to-br ${integration.gradient}`}
          >
            <integration.icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">
              {integration.name}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {integration.subtitle}
            </CardDescription>
          </div>
        </div>
        {getStatusBadge(integration.status)}
      </div>
    </CardHeader>
    <CardContent className="pb-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {integration.description}
      </p>
      {integration.status === "Connected" && (
        <div className="mt-3 flex items-center gap-2 text-xs text-success">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Syncing data automatically</span>
        </div>
      )}
    </CardContent>
    <CardFooter>
      <Button
        className="w-full"
        variant={integration.status === "Connected" ? "secondary" : "default"}
        onClick={() => onConnect(integration.connectHandler)}
        disabled={isLoading || integration.status === "Connected"}
      >
        {integration.status === "Connected" ? (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Connected
          </>
        ) : (
          <>
            <Link className="h-4 w-4 mr-2" />
            {isLoading ? "Connecting..." : "Connect Now"}
          </>
        )}
      </Button>
    </CardFooter>
  </Card>
);

const Profile = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState({
    meta: false,
    google: false,
    shopify: false,
  });
  const navigate = useNavigate();

  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [platformStatusLoading, setPlatformStatusLoading] = useState(true);
  const [platformStatusError, setPlatformStatusError] = useState<string | null>(
    null
  );

  // Effect 1: Fetch User Profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);
      const userId = localStorage.getItem("user_id");
      const token = localStorage.getItem("access_token");

      if (!userId || !token) {
        setProfileError("Authentication required. Please log in.");
        setProfileLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${backendUrl}/user/${userId}/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUserData(response.data);
      } catch (err: any) {
        console.error("Failed to fetch user profile:", err);
        setProfileError(
          err.response?.data?.detail || "Could not load profile."
        );
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.clear();
        }
      } finally {
        setProfileLoading(false);
      }
    };

    if (localStorage.getItem("isAdmin") === "true") {
      setIsAdmin(true);
    }
    fetchUserProfile();
  }, []);

  // Effect 2: Fetch Platform Connection Status
  useEffect(() => {
    const fetchPlatformStatus = async () => {
      setPlatformStatusLoading(true);
      setPlatformStatusError(null);
      setConnectedAccounts({ meta: false, google: false, shopify: false });

      const userId = localStorage.getItem("user_id");
      const token = localStorage.getItem("access_token");

      if (!userId || !token) {
        setPlatformStatusError("Authentication required.");
        setPlatformStatusLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${backendUrl}/user/${userId}/platforms`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const statusFromBackend = response.data;
        setConnectedAccounts({
          meta: statusFromBackend.meta?.connected || false,
          google: statusFromBackend.google?.connected || false,
          shopify: statusFromBackend.shopify?.connected || false,
        });
      } catch (err: any) {
        console.error("Failed to fetch platform status:", err);
        setPlatformStatusError(
          err.response?.data?.detail || "Could not load connection status."
        );
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.clear();
        }
      } finally {
        setPlatformStatusLoading(false);
      }
    };

    fetchPlatformStatus();
  }, []);

  // Effect 3: Handle OAuth Redirect (Shopify, Meta, Google) - FIXED VERSION
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for Shopify callback parameters
    const shopifyCode = urlParams.get("code");
    const shopifyShop = urlParams.get("shop");
    const shopifyHmac = urlParams.get("hmac");

    // Check for general platform parameter (Meta/Google)
    const platform = urlParams.get("platform");
    const platformUserId = urlParams.get("user_id");

    // Handle Shopify OAuth callback
    if (shopifyCode && shopifyShop && shopifyHmac) {
      console.log("Shopify OAuth callback detected");

      // 🔥 CHECK IF WE ALREADY PROCESSED THIS CALLBACK
      const callbackProcessed = sessionStorage.getItem(
        "shopify_callback_processed"
      );

      if (!callbackProcessed) {
        // Mark as processed FIRST to prevent infinite loop
        sessionStorage.setItem("shopify_callback_processed", "true");

        // Clean the URL
        window.history.replaceState({}, document.title, "/profile");

        // Show success message
        alert("Shopify connected successfully! Refreshing your connections...");

        // Refresh platform status to show new connection
        window.location.reload();
      }
      return;
    }

    // 🔥 CLEAR THE FLAG if no Shopify callback params (normal page load)
    sessionStorage.removeItem("shopify_callback_processed");

    // Handle Meta/Google OAuth callback
    if (platformUserId && platform) {
      console.log(
        `OAuth redirect detected for ${platform}, user ID ${platformUserId}`
      );

      if (!localStorage.getItem("user_id")) {
        localStorage.setItem("user_id", platformUserId);
        console.log(`Saved user ID ${platformUserId} from URL parameter.`);
      } else {
        const storedUserId = localStorage.getItem("user_id");
        if (platformUserId !== storedUserId) {
          console.warn(
            `OAuth redirect user ID (${platformUserId}) doesn't match stored user ID (${storedUserId}).`
          );
        }
      }

      // Clean the URL parameters
      window.history.replaceState({}, document.title, "/profile");
    }
  }, []);

  const integrations = [
    {
      name: "Meta Ads",
      subtitle: "Facebook & Instagram",
      icon: Facebook,
      status: connectedAccounts.meta ? "Connected" : "Disconnected",
      gradient: "from-blue-500 to-blue-600",
      description:
        "Sync campaigns, ads, and ad sets from Facebook and Instagram to track ROAS and performance metrics in real-time.",
      connectHandler: "meta",
    },
    {
      name: "Google Ads",
      subtitle: "Search & Display",
      icon: GanttChart,
      status: connectedAccounts.google ? "Connected" : "Disconnected",
      gradient: "from-red-500 to-orange-500",
      description:
        "Integrate performance data from your Google Search and Display campaigns to analyze click-through rates and conversions.",
      connectHandler: "google",
    },
    {
      name: "Shopify Store",
      subtitle: "E-commerce Platform",
      icon: ShoppingCart,
      status: connectedAccounts.shopify ? "Connected" : "Disconnected",
      gradient: "from-green-500 to-emerald-600",
      description:
        "Pull revenue and order data for accurate ROAS calculation and understand which ads drive the most sales.",
      connectHandler: "shopify",
    },
  ];

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const token = localStorage.getItem("access_token");

    if (!token) {
      console.error("Auth token missing. Cannot initiate Google login.");
      setProfileError("Authentication required. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Requesting Google redirect URL from backend...");
      const response = await axios.get(`${backendUrl}/google/login`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const redirectUrl = response.data.redirect_url;
      if (redirectUrl) {
        console.log("Received redirect URL, redirecting browser:", redirectUrl);
        window.location.href = redirectUrl;
      } else {
        console.error("Backend did not provide a redirect URL.");
        setProfileError(
          "Could not initiate Google connection. Please try again."
        );
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Error initiating Google login:", error);
      setProfileError(
        error.response?.data?.detail || "Failed to start Google connection."
      );
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.clear();
        navigate("/signin");
      }
      setIsLoading(false);
    }
  };

  const handleMetaLogin = async () => {
    setIsLoading(true);
    const token = localStorage.getItem("access_token");

    if (!token) {
      console.error("Auth token missing. Cannot initiate Meta login.");
      setProfileError("Authentication required. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Requesting Meta redirect URL from backend...");
      const response = await axios.get(`${backendUrl}/meta/login`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const redirectUrl = response.data.redirect_url;
      if (redirectUrl) {
        console.log("Received redirect URL, redirecting browser:", redirectUrl);
        window.location.href = redirectUrl;
      } else {
        console.error("Backend did not provide a redirect URL.");
        setProfileError(
          "Could not initiate Meta connection. Please try again."
        );
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Error initiating Meta login:", error);
      setProfileError(
        error.response?.data?.detail || "Failed to start Meta connection."
      );
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.clear();
        navigate("/signin");
      }
      setIsLoading(false);
    }
  };

  const handleShopifyConnect = async () => {
    setIsLoading(true);

    // 🔥 ADD THIS - Get the token
    const token = localStorage.getItem("access_token");

    if (!token) {
      console.error("Auth token missing. Cannot initiate Shopify login.");
      setProfileError("Authentication required. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
      // Ask user for their shop domain
      const shopInput = prompt(
        "Enter your Shopify store domain:\n\n" +
          "Examples:\n" +
          "• mystore.myshopify.com\n" +
          "• mystore"
      );

      if (!shopInput) {
        setIsLoading(false);
        return;
      }

      // Clean up the input
      let shop = shopInput.trim().toLowerCase();
      shop = shop.replace("https://", "").replace("http://", "");
      shop = shop.split("/")[0];

      // Add .myshopify.com if not present
      if (!shop.includes(".")) {
        shop = `${shop}.myshopify.com`;
      }

      console.log("Requesting Shopify OAuth URL with shop:", shop);

      // 🔥 ADD AUTH HEADER - Now matches Meta/Google pattern
      const response = await axios.get(`${backendUrl}/shopify/login`, {
        params: { shop },
        headers: { Authorization: `Bearer ${token}` }, // 👈 ADD THIS
      });

      const redirectUrl = response.data.redirect_url;
      if (redirectUrl) {
        console.log("Redirecting to Shopify authorization...");
        window.location.href = redirectUrl;
      } else {
        throw new Error("No redirect URL received");
      }
    } catch (error: any) {
      console.error("Error initiating Shopify login:", error);
      setProfileError(
        error.response?.data?.detail ||
          "Failed to start Shopify connection. Please check your store domain and try again."
      );
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.clear();
        navigate("/signin");
      }
      setIsLoading(false);
    }
  };

  const handleConnect = (platform) => {
    switch (platform) {
      case "meta":
        handleMetaLogin();
        break;
      case "google":
        handleGoogleLogin();
        break;
      case "shopify":
        handleShopifyConnect();
        break;
      default:
        console.log("Unknown platform:", platform);
    }
  };

  const handleGoToDashboard = () => {
    const userId = localStorage.getItem("user_id");
    if (userId) {
      navigate(`/?user_id=${userId}`);
    } else {
      navigate("/");
    }
  };

  const hasAnyConnection = Object.values(connectedAccounts).some((v) => v);
  const connectedCount = Object.values(connectedAccounts).filter(
    (v) => v
  ).length;

  if (profileLoading || platformStatusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading profile and connections...
      </div>
    );
  }

  const displayError = profileError || platformStatusError;
  if (displayError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive">
        {displayError}{" "}
        <Button onClick={() => navigate("/signin")} variant="link">
          Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <User className="h-7 w-7 text-primary" />
                </div>
                Profile & Settings
              </h1>
              <p className="text-muted-foreground">
                Manage your account and connect advertising platforms
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Button
                  onClick={() => navigate("/admin")}
                  size="lg"
                  variant="outline"
                  className="hidden md:flex"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Admin Portal
                </Button>
              )}
              {hasAnyConnection && (
                <Button
                  onClick={handleGoToDashboard}
                  size="lg"
                  className="hidden md:flex"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {hasAnyConnection && (
        <div className="max-w-7xl mx-auto px-6 md:px-10 mt-6">
          <div className="bg-gradient-to-r from-success/10 to-success/5 border-2 border-success/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-success-foreground">
                    {connectedCount} Platform{connectedCount > 1 ? "s" : ""}{" "}
                    Connected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your data is syncing automatically
                  </p>
                </div>
              </div>
              <Button
                onClick={handleGoToDashboard}
                className="md:hidden"
                size="sm"
              >
                Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Profile Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-2">
              <CardHeader className="pb-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 border-4 border-primary/20 mb-4">
                    <AvatarImage
                      src={
                        "https://placehold.co/100x100/A0BFFF/FFFFFF?text=" +
                        (userData?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "U")
                      }
                      alt={userData?.name || "User"}
                    />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-2xl">
                      {userData?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-2xl font-bold">
                    {userData?.name || "User"}
                  </CardTitle>
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="space-y-5 pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Email Address
                      </p>
                      <p className="text-sm font-medium truncate">
                        {userData?.email || userData?.id || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Connected Platforms
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {connectedAccounts.meta && (
                          <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200">
                            Meta
                          </div>
                        )}
                        {connectedAccounts.google && (
                          <div className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-200">
                            Google
                          </div>
                        )}
                        {connectedAccounts.shopify && (
                          <div className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold border border-green-200">
                            Shopify
                          </div>
                        )}
                        {!hasAnyConnection && (
                          <p className="text-sm text-muted-foreground italic">
                            No platforms connected yet
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <Separator />

              <CardFooter className="flex flex-col gap-3 pt-6">
                <Button variant="secondary" className="w-full" size="lg">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button variant="outline" className="w-full" size="lg">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* RIGHT: Integrations */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-xl border-2 p-6">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Link className="h-6 w-6 text-primary" />
                Platform Integrations
              </h2>
              <p className="text-muted-foreground">
                Connect your advertising platforms to start tracking performance
                metrics. All data syncs automatically once connected.
              </p>
            </div>

            <div className="space-y-5">
              {integrations.map((integration) => (
                <IntegrationCard
                  key={integration.name}
                  integration={integration}
                  onConnect={handleConnect}
                  isLoading={isLoading}
                />
              ))}
            </div>

            {/* Help Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      Need Help Connecting?
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Check our documentation or contact support if you're
                      having trouble connecting your accounts.
                    </p>
                    <Button variant="outline" size="sm">
                      View Documentation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
