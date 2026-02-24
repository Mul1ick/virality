// pages/SelectMetaAccount.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AccountSelectionModal } from "@/components/modals/AccountSelectionModal";
import { Loader2 } from "lucide-react";
import apiClient from "@/lib/api";

const SelectMetaAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const userId = searchParams.get("user_id");
  const transferToken = searchParams.get("token"); // <-- 1. Grab the token from URL

useEffect(() => {
    const initializeAuth = async () => {
      // If no token or user_id in URL, check fallback
      if (!userId || !transferToken) {
        const token = localStorage.getItem("access_token");
        if (!token) navigate("/signin");
        return;
      }

      try {
        // 2. SEND THE TOKEN: The backend is looking for `payload.get("token")`
        const response = await apiClient.post("/auth/verify-oauth-session", { 
          token: transferToken // <-- Changed from user_id to token
        });

        // 3. PERSIST SESSION
        localStorage.setItem("access_token", response.data.access_token);
        localStorage.setItem("user_id", userId);

        setIsModalOpen(true);
      } catch (error) {
        console.error("OAuth session verification failed:", error);
        localStorage.removeItem("access_token");
        navigate("/signin");
      }
    };

    initializeAuth();
  }, [userId, transferToken, navigate]); // <-- Add transferToken to dependency array

  const handleComplete = (accountId: string) => {
    console.log("✅ Meta account selected:", accountId);
    // Redirect to dashboard with user_id
    navigate("/dashboard");
  };

  const handleCancel = () => {
    // User cancelled - redirect to profile or dashboard
    navigate(`/profile?user_id=${userId}`);
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Meta accounts...</p>
        </div>
      </div>

      <AccountSelectionModal
        isOpen={isModalOpen}
        platform="meta"
        userId={userId}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </>
  );
};

export default SelectMetaAccount;
