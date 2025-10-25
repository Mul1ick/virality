// components/dashboard/NotificationBanner.tsx
import { BarChart3, Facebook, Search, ShoppingCart } from "lucide-react";

interface NotificationState {
  loading: {
    platforms: boolean;
    meta: boolean;
    google: boolean;
    shopify: boolean;
  };
  error: {
    platforms: string | null;
    meta: string | null;
    google: string | null;
    shopify: string | null;
  };
  success: {
    meta: boolean;
    google: boolean;
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

      {/* Meta Loading */}
      {loading.meta && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4 text-blue-600" />
            <p className="text-blue-700">Loading Meta data...</p>
          </div>
        </div>
      )}

      {/* Google Loading */}
      {loading.google && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-red-600" />
            <p className="text-red-700">Loading Google campaigns...</p>
          </div>
        </div>
      )}

      {/* Shopify Loading */}
      {loading.shopify && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-green-600" />
            <p className="text-green-700">Loading Shopify data...</p>
          </div>
        </div>
      )}

      {/* Meta Error */}
      {error.meta && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4 text-red-600" />
            <p className="text-red-700">Meta: {error.meta}</p>
          </div>
        </div>
      )}

      {/* Google Error */}
      {error.google && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-red-600" />
            <p className="text-red-700">Google: {error.google}</p>
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

      {/* Meta Success */}
      {success.meta && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4 text-green-600" />
            <p className="text-green-700">
              ✅ Meta data loaded! {counts.metaCampaigns} campaigns,{" "}
              {counts.metaAdSets} ad sets, {counts.metaAds} ads
            </p>
          </div>
        </div>
      )}

      {/* Google Success */}
      {success.google && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-green-600" />
            <p className="text-green-700">
              ✅ {counts.googleCampaigns} Google campaigns loaded!
            </p>
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
