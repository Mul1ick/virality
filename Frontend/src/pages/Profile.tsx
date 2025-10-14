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
  AlertTriangle,
  Link,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// User mock data
const user = {
  name: "Alex Johnson",
  email: "alex.johnson@example.com",
  role: "Marketing Manager",
  avatarUrl: "https://placehold.co/100x100/A0BFFF/FFFFFF?text=AJ",
};

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const getStatusIcon = (status) => {
  if (status === "Connected") {
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
  return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
};

const IntegrationCard = ({ integration, onConnect, isLoading }) => (
  <Card className="hover:shadow-lg transition-shadow duration-200 h-full flex flex-col justify-between">
    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-full bg-primary/10 ${integration.color}`}>
          <integration.icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-lg font-semibold">
          {integration.name}
        </CardTitle>
      </div>
      <div className="flex items-center text-sm font-medium">
        {getStatusIcon(integration.status)}
        <span className="ml-1 text-muted-foreground">{integration.status}</span>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4">
        {integration.description}
      </p>
    </CardContent>
    <CardFooter>
      <Button
        className="w-full transition-transform hover:scale-[1.01] duration-150"
        variant={integration.status === "Connected" ? "outline" : "default"}
        onClick={() => onConnect(integration.connectHandler)}
        disabled={isLoading || integration.status === "Connected"}
      >
        <Link className="h-4 w-4 mr-2" />
        {isLoading
          ? "Connecting..."
          : integration.status === "Connected"
          ? "Connected"
          : "Connect Now"}
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

  // Check URL parameters for successful connections
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("user_id");
    const platform = urlParams.get("platform");

    if (userId && platform) {
      // Mark the platform as connected
      setConnectedAccounts((prev) => ({
        ...prev,
        [platform]: true,
      }));

      // Store in localStorage for persistence
      const stored = JSON.parse(
        localStorage.getItem("connectedAccounts") || "{}"
      );
      stored[platform] = true;
      localStorage.setItem("connectedAccounts", JSON.stringify(stored));
      localStorage.setItem("user_id", userId);

      // Clean up URL
      window.history.replaceState({}, document.title, "/profile");
    }

    // Load previously connected accounts from localStorage
    const stored = JSON.parse(
      localStorage.getItem("connectedAccounts") || "{}"
    );
    setConnectedAccounts((prev) => ({
      ...prev,
      ...stored,
    }));
  }, []);

  const integrations = [
    {
      name: "Meta Ads",
      icon: Facebook,
      status: connectedAccounts.meta ? "Connected" : "Disconnected",
      color: "text-blue-600",
      description:
        "Sync campaigns, ads, and ad sets from Facebook and Instagram.",
      connectHandler: "meta",
    },
    {
      name: "Google Ads",
      icon: GanttChart,
      status: connectedAccounts.google ? "Connected" : "Disconnected",
      color: "text-red-500",
      description:
        "Integrate performance data from your Google Search and Display campaigns.",
      connectHandler: "google",
    },
    {
      name: "Shopify Store",
      icon: ShoppingCart,
      status: connectedAccounts.shopify ? "Connected" : "Disconnected",
      color: "text-green-600",
      description: "Pull revenue and order data for accurate ROAS calculation.",
      connectHandler: "shopify",
    },
  ];

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      window.location.href = `${backendUrl}/google/login`;
    } catch (error) {
      console.error("Error fetching Google login URL:", error);
      setIsLoading(false);
    }
  };

  const handleMetaLogin = async () => {
    setIsLoading(true);
    try {
      window.location.href = `${backendUrl}/meta/login`;
    } catch (error) {
      console.error("Error fetching Meta login URL:", error);
      setIsLoading(false);
    }
  };

  const handleShopifyConnect = async () => {
    setIsLoading(true);
    try {
      // Add Shopify connection logic here when available
      console.log("Shopify connection not yet implemented");
      setIsLoading(false);
    } catch (error) {
      console.error("Error connecting to Shopify:", error);
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

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <User className="h-7 w-7 text-primary" />
          User Profile & Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account information and platform integrations.
        </p>
      </header>

      {/* Success Banner */}
      {hasAnyConnection && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-700 font-medium">
                Great! You've connected{" "}
                {Object.values(connectedAccounts).filter((v) => v).length}{" "}
                platform(s).
              </p>
            </div>
            <Button
              onClick={handleGoToDashboard}
              className="bg-green-600 hover:bg-green-700"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-10 max-w-6xl">
        {/* LEFT: Profile Card */}
        <div className="lg:w-1/3 flex flex-col">
          <Card className="shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 border-4 border-primary/20">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl font-semibold">
                    {user.name}
                  </CardTitle>
                  <CardDescription>{user.role}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Email</p>
                <p>{user.email}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">App ID</p>
                <p className="truncate">#9479387489923</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground mb-2">
                  Connected Platforms
                </p>
                <div className="flex gap-2">
                  {connectedAccounts.meta && (
                    <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      Meta
                    </div>
                  )}
                  {connectedAccounts.google && (
                    <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                      Google
                    </div>
                  )}
                  {connectedAccounts.shopify && (
                    <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      Shopify
                    </div>
                  )}
                  {!hasAnyConnection && (
                    <p className="text-sm text-muted-foreground">None yet</p>
                  )}
                </div>
              </div>
              <Separator />
              <Button variant="secondary" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile Details
              </Button>
              <Button variant="destructive" className="w-full">
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Integrations */}
        <div className="lg:w-2/3 space-y-6 flex flex-col">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Platform Integrations
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Connect your advertising platforms to start tracking performance.
              You can connect multiple accounts.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.name}
                integration={integration}
                onConnect={handleConnect}
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
