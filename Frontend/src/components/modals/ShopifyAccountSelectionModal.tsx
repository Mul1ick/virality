import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Loader2, CheckCircle2 } from "lucide-react";
import axios from "axios";

interface ShopifyAccountSelectionModalProps {
  isOpen: boolean;
  userId: string;
  onComplete: (shopUrl: string) => void;
  onCancel: () => void;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export const ShopifyAccountSelectionModal = ({
  isOpen,
  userId,
  onComplete,
  onCancel,
}: ShopifyAccountSelectionModalProps) => {
  const [shopInfo, setShopInfo] = useState<{
    shop_url: string;
    connected: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchShopInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.get(
          `${backendUrl}/user/${userId}/platforms`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const shopifyData = response.data.shopify;
        if (shopifyData?.shop_url) {
          setShopInfo({
            shop_url: shopifyData.shop_url,
            connected: shopifyData.connected || false,
          });
        } else {
          setError("No Shopify store found. Please reconnect.");
        }
      } catch (err: any) {
        console.error("Failed to fetch shop info:", err);
        setError(err.response?.data?.detail || "Failed to load shop info");
      } finally {
        setLoading(false);
      }
    };

    fetchShopInfo();
  }, [isOpen, userId]);

  const handleConfirm = async () => {
    if (!shopInfo) return;

    setConfirming(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `${backendUrl}/shopify/confirm-shop`,
        { shop_url: shopInfo.shop_url },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      onComplete(shopInfo.shop_url);
    } catch (err: any) {
      console.error("Failed to confirm shop:", err);
      setError(err.response?.data?.detail || "Failed to confirm shop");
      setConfirming(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !confirming && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <ShoppingCart className="h-6 w-6 text-green-600" />
            Confirm Shopify Store
          </DialogTitle>
          <DialogDescription>
            Confirm your Shopify store connection to start syncing order data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {!loading && shopInfo && (
            <Card className="p-4 border-2 border-green-200 bg-green-50">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-600 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">
                      {shopInfo.shop_url}
                    </h3>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connected and ready to sync
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={confirming}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!shopInfo || confirming || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {confirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              "Confirm & Continue"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
