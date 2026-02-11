import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GoogleAccountSelectionModal } from "@/components/modals/GoogleAccountSelectionModal";
import { Loader2 } from "lucide-react";

const SelectGoogleAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const userId = searchParams.get("user_id");

  useEffect(() => {
    if (!userId) {
      navigate("/signin");
      return;
    }
    setIsModalOpen(true);
  }, [userId, navigate]);

  const handleComplete = (managerId: string, customerId: string) => {
    console.log("✅ Google accounts selected:", { managerId, customerId });
    navigate(`/dashboard`);
  };

  const handleCancel = () => {
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
          <p className="text-muted-foreground">Loading Google accounts...</p>
        </div>
      </div>

      <GoogleAccountSelectionModal
        isOpen={isModalOpen}
        userId={userId}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </>
  );
};

export default SelectGoogleAccount;
