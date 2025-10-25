// pages/SelectMetaAccount.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AccountSelectionModal } from "@/components/modals/AccountSelectionModal";
import { Loader2 } from "lucide-react";

const SelectMetaAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const userId = searchParams.get("user_id");

  useEffect(() => {
    if (!userId) {
      // No user_id - redirect to signin
      navigate("/signin");
      return;
    }

    // Open modal automatically when page loads
    setIsModalOpen(true);
  }, [userId, navigate]);

  const handleComplete = (accountId: string) => {
    console.log("✅ Meta account selected:", accountId);
    // Redirect to dashboard with user_id
    navigate(`/?user_id=${userId}`);
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
