// components/dashboard/NotificationBanner.tsx
import { BarChart3, ShoppingCart } from "lucide-react";

interface NotificationState {
  loading: {
    platforms: boolean;
    shopify: boolean;
  };
  error: {
    platforms: string | null;
    shopify: string | null;
  };
  success: {
    shopify: boolean;
  };
  counts: {
    metaCampaigns: number;
    metaAdSets: number;
    metaAds: number;
    googleCampaigns: number;
    shopifyOrders: number;
  };
}

export const NotificationBanner = ({
  loading,
  error,
  success,
  counts,
}: NotificationState) => {
  return (
    <div className="space-y-3 mb-6">
      {/* Platform Loading */}
      {loading.platforms && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600 animate-spin" />
            <p className="text-blue-700">Loading platform connections...</p>
          </div>
        </div>
      )}

      {/* Platform Error */}
      {error.platforms && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-red-600" />
            <p className="text-red-700">{error.platforms}</p>
          </div>
        </div>
      )}

      {/* Shopify Loading */}
      {loading.shopify && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-600 animate-spin" />
            <p className="text-blue-700">Loading Shopify data...</p>
          </div>
        </div>
      )}

      {/* Shopify Error */}
      {error.shopify && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-red-600" />
            <p className="text-red-700">Shopify: {error.shopify}</p>
          </div>
        </div>
      )}

      {/* Shopify Success */}
      {success.shopify && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-green-600" />
            <p className="text-green-700">
              ✅ {counts.shopifyOrders} Shopify orders loaded!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
