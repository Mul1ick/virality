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
  Sparkles,
  UserCheck,
  Zap,
  Lock,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";

interface UserProfileData {
  id: string;
  name: string;
  email: string;
}

const getStatusBadge = (status, comingSoon = false) => {
  if (comingSoon) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-lg text-xs font-semibold border border-amber-500/20 shadow-sm">
        <Clock className="h-3.5 w-3.5" />
        Coming Soon
      </div>
    );
  }
  if (status === "Connected") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success/20 text-success rounded-lg text-xs font-semibold border border-success/30 shadow-sm">
        <CheckCircle className="h-3.5 w-3.5" />
        Connected
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 text-muted-foreground rounded-lg text-xs font-medium border border-border/50">
      <AlertCircle className="h-3.5 w-3.5" />
      Not Connected
    </div>
  );
};

const IntegrationCard = ({ integration, onConnect, loadingPlatform }) => (
  <Card
    className={`bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group ${
      integration.comingSoon ? "opacity-75" : ""
    }`}
  >
    <CardHeader className="pb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-xl bg-gradient-to-br ${
              integration.gradient
            } shadow-md group-hover:scale-105 transition-transform duration-300 ${
              integration.comingSoon ? "opacity-60" : ""
            }`}
          >
            <integration.icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              {integration.name}
              {integration.comingSoon && (
                <Lock className="h-4 w-4 text-amber-500" />
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-1 text-muted-foreground">
              {integration.subtitle}
            </CardDescription>
          </div>
        </div>
        {getStatusBadge(integration.status, integration.comingSoon)}
      </div>
    </CardHeader>
    <CardContent className="pb-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {integration.description}
      </p>
      {integration.status === "Connected" && !integration.comingSoon && (
        <div className="mt-3 flex items-center gap-2 text-xs text-success bg-success/10 px-3 py-1.5 rounded-lg border border-success/20">
          <CheckCircle className="h-3.5 w-3.5" />
          <span className="font-medium">Syncing data automatically</span>
        </div>
      )}
      {integration.comingSoon && (
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="font-medium">Integration under development</span>
        </div>
      )}
    </CardContent>
    <CardFooter>
      <Button
        className="w-full transition-all duration-300"
        variant={
          integration.status === "Connected" || integration.comingSoon
            ? "secondary"
            : "default"
        }
        onClick={() =>
          !integration.comingSoon && onConnect(integration.connectHandler)
        }
        disabled={
          !!loadingPlatform ||
          integration.status === "Connected" ||
          integration.comingSoon
        }
      >
        {integration.comingSoon ? (
          <>
            <Lock className="h-4 w-4 mr-2" />
            Coming Soon
          </>
        ) : integration.status === "Connected" ? (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Connected
          </>
        ) : (
          <>
            <Link className="h-4 w-4 mr-2" />
            {loadingPlatform === integration.connectHandler ? "Connecting..." : "Connect Now"}
          </>
        )}
      </Button>
    </CardFooter>
  </Card>
);

const Profile = () => {
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
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

      if (!userId) {
        setProfileError("Authentication required. Please log in.");
        setProfileLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(`/user/${userId}/profile`);
        setUserData(response.data);
      } catch (err: any) {
        console.error("Failed to fetch user profile:", err);
        // 401 is handled globally by apiClient interceptor
        if (err.response?.status !== 401) {
          setProfileError(
            err.response?.data?.detail || "Could not load profile."
          );
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

      if (!userId) {
        setPlatformStatusError("Authentication required.");
        setPlatformStatusLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(`/user/${userId}/platforms`);

        const statusFromBackend = response.data;
        setConnectedAccounts({
          meta: statusFromBackend.meta?.connected || false,
          google: statusFromBackend.google?.connected || false,
          // shopify: statusFromBackend.shopify?.connected || false, // COMMENTED OUT - Coming Soon
          shopify: false, // Always false for now
        });
      } catch (err: any) {
        console.error("Failed to fetch platform status:", err);
        // 401 is handled globally by apiClient interceptor
        if (err.response?.status !== 401) {
          setPlatformStatusError(
            err.response?.data?.detail || "Could not load connection status."
          );
        }
      } finally {
        setPlatformStatusLoading(false);
      }
    };

    fetchPlatformStatus();
  }, []);

  // Effect 3: Handle OAuth Redirect (Shopify section COMMENTED OUT)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    /* SHOPIFY CALLBACK HANDLING - COMMENTED OUT FOR NOW
    const shopifyCode = urlParams.get("code");
    const shopifyShop = urlParams.get("shop");
    const shopifyHmac = urlParams.get("hmac");

    if (shopifyCode && shopifyShop && shopifyHmac) {
      console.log("Shopify OAuth callback detected");

      const callbackProcessed = sessionStorage.getItem(
        "shopify_callback_processed"
      );

      if (!callbackProcessed) {
        sessionStorage.setItem("shopify_callback_processed", "true");
        window.history.replaceState({}, document.title, "/profile");
        alert("Shopify connected successfully! Refreshing your connections...");
        window.location.reload();
      }
      return;
    }

    sessionStorage.removeItem("shopify_callback_processed");
    */

    const platform = urlParams.get("platform");
    const platformUserId = urlParams.get("user_id");

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
      comingSoon: false,
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
      comingSoon: false,
    },
    {
      name: "Shopify Store",
      subtitle: "E-commerce Platform",
      icon: ShoppingCart,
      status: "Disconnected", // Always disconnected for now
      gradient: "from-green-500 to-emerald-600",
      description:
        "Pull revenue and order data for accurate ROAS calculation. Integration currently under development.",
      connectHandler: "shopify",
      comingSoon: true, // NEW FLAG
    },
  ];

  const handleGoogleLogin = async () => {
    setLoadingPlatform("google");

    try {
      console.log("Requesting Google redirect URL from backend...");
      const response = await apiClient.get(`/google/login`);

      const redirectUrl = response.data.redirect_url;
      if (redirectUrl) {
        console.log("Received redirect URL, redirecting browser:", redirectUrl);
        window.location.href = redirectUrl;
      } else {
        console.error("Backend did not provide a redirect URL.");
        setProfileError(
          "Could not initiate Google connection. Please try again."
        );
        setLoadingPlatform(null);
      }
    } catch (error: any) {
      console.error("Error initiating Google login:", error);
      if (error.response?.status !== 401) {
        setProfileError(
          error.response?.data?.detail || "Failed to start Google connection."
        );
      }
      setLoadingPlatform(null);
    }
  };

  const handleMetaLogin = async () => {
    setLoadingPlatform("meta");

    try {
      console.log("Requesting Meta redirect URL from backend...");
      const response = await apiClient.get(`/meta/login`);

      const redirectUrl = response.data.redirect_url;
      if (redirectUrl) {
        console.log("Received redirect URL, redirecting browser:", redirectUrl);
        window.location.href = redirectUrl;
      } else {
        console.error("Backend did not provide a redirect URL.");
        setProfileError(
          "Could not initiate Meta connection. Please try again."
        );
        setLoadingPlatform(null);
      }
    } catch (error: any) {
      console.error("Error initiating Meta login:", error);
      if (error.response?.status !== 401) {
        setProfileError(
          error.response?.data?.detail || "Failed to start Meta connection."
        );
      }
      setLoadingPlatform(null);
    }
  };

  /* SHOPIFY CONNECT HANDLER - COMMENTED OUT FOR NOW
  const handleShopifyConnect = async () => {
    setIsLoading(true);

    const token = localStorage.getItem("access_token");

    if (!token) {
      console.error("Auth token missing. Cannot initiate Shopify login.");
      setProfileError("Authentication required. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
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

      let shop = shopInput.trim().toLowerCase();
      shop = shop.replace("https://", "").replace("http://", "");
      shop = shop.split("/")[0];

      if (!shop.includes(".")) {
        shop = `${shop}.myshopify.com`;
      }

      console.log("Requesting Shopify OAuth URL with shop:", shop);

      const response = await axios.get(`${backendUrl}/shopify/login`, {
        params: { shop },
        headers: { Authorization: `Bearer ${token}` },
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
  */

  const handleConnect = (platform) => {
    switch (platform) {
      case "meta":
        handleMetaLogin();
        break;
      case "google":
        handleGoogleLogin();
        break;
      case "shopify":
        // handleShopifyConnect(); // COMMENTED OUT
        console.log("Shopify integration coming soon");
        break;
      default:
        console.log("Unknown platform:", platform);
    }
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  const handleSignOut = () => {
    localStorage.clear();
    navigate("/");
  };

  const hasAnyConnection = Object.values(connectedAccounts).some((v) => v);
  const connectedCount = Object.values(connectedAccounts).filter(
    (v) => v
  ).length;

  if (profileLoading || platformStatusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Loading profile and connections...
          </p>
        </div>
      </div>
    );
  }

  const displayError = profileError || platformStatusError;
  if (displayError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="bg-destructive/10 border-destructive/50 p-6 max-w-md">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-semibold mb-4">
              {displayError}
            </p>
            <Button onClick={() => navigate("/signin")} variant="outline">
              Return to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Dark gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -z-10"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent -z-10"></div>

      {/* Header Section */}
      <div className="bg-card/30 border-b border-border/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl blur-md"></div>
                  <div className="relative p-2 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg">
                    <User className="h-7 w-7 text-white" />
                  </div>
                </div>
                <span className="text-gradient">Profile & Settings</span>
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
                  className="hidden md:flex border-border/50 hover:border-primary/50"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Admin Portal
                </Button>
              )}
              {hasAnyConnection && (
                <Button
                  onClick={handleGoToDashboard}
                  size="lg"
                  className="hidden md:flex shadow-lg shadow-primary/20"
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
          <Card className="bg-success/10 border-success/30 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-success/0 via-success/5 to-success/0 animate-pulse"></div>
            <CardContent className="pt-4 pb-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
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
                  className="md:hidden shadow-md"
                  size="sm"
                >
                  Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Profile Card */}
          <div className="lg:col-span-1">
            <Card className="bg-card/50 border-border/50 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-xl"></div>
                    <Avatar className="h-24 w-24 border-4 border-primary/20 relative shadow-lg">
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
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold text-2xl">
                        {userData?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {userData?.name || "User"}
                  </CardTitle>
                </div>
              </CardHeader>

              <Separator className="bg-border/50" />

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
                      <p className="text-sm font-medium truncate text-foreground">
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
                          <div className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold border border-blue-500/30">
                            Meta
                          </div>
                        )}
                        {connectedAccounts.google && (
                          <div className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold border border-red-500/30">
                            Google
                          </div>
                        )}
                        {/* Shopify badge removed since it's coming soon */}
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

              <Separator className="bg-border/50" />

              <CardFooter className="flex flex-col gap-3 pt-6">
                <Button
                  variant="secondary"
                  className="w-full border-border/50"
                  size="lg"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-border/50 hover:border-destructive/50 hover:text-destructive"
                  size="lg"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* RIGHT: Integrations */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card/50 border-border/50 backdrop-blur-sm p-6">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Link className="h-6 w-6 text-primary" />
                Platform Integrations
              </h2>
              <p className="text-muted-foreground">
                Connect your advertising platforms to start tracking performance
                metrics. All data syncs automatically once connected.
              </p>
            </Card>

            <div className="space-y-5">
              {integrations.map((integration) => (
                <IntegrationCard
                  key={integration.name}
                  integration={integration}
                  onConnect={handleConnect}
                  loadingPlatform={loadingPlatform}
                />
              ))}
            </div>

            {/* Help Card */}
            <Card className="bg-primary/10 border-primary/30 backdrop-blur-sm overflow-hidden relative">
              <div className="absolute inset-0 animated-gradient"></div>
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/20 rounded-xl">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 text-foreground">
                      Need Help Connecting?
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Check our documentation or contact support if you're
                      having trouble connecting your accounts.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border/50 hover:border-primary/50"
                    >
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
