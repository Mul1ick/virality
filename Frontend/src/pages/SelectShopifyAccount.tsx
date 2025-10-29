import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShopifyAccountSelectionModal } from "@/components/modals/ShopifyAccountSelectionModal";
import { Loader2 } from "lucide-react";

const SelectShopifyAccount = () => {
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

  const handleComplete = (shopUrl: string) => {
    console.log("✅ Shopify shop confirmed:", shopUrl);
    navigate(`/?user_id=${userId}`);
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
          <p className="text-muted-foreground">Loading Shopify store...</p>
        </div>
      </div>

      <ShopifyAccountSelectionModal
        isOpen={isModalOpen}
        userId={userId}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </>
  );
};

export default SelectShopifyAccount;
