// FILE: Frontend/src/components/dashboard/ShopifySyncStatus.tsx

import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShopifySyncStatusProps {
  syncing: boolean;
  syncComplete: boolean;
  syncError: string | null;
  onRetry?: () => void;
}

export const ShopifySyncStatus = ({
  syncing,
  syncComplete,
  syncError,
  onRetry,
}: ShopifySyncStatusProps) => {
  if (!syncing && !syncError && syncComplete) return null;

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        {syncing && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">
                Syncing Your Shopify Data
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                We're fetching your orders, products, and customers from
                Shopify. This typically takes 1-2 minutes for large stores.
                Please don't close this page.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                <div
                  className="h-2 w-2 bg-primary rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="h-2 w-2 bg-primary rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </>
        )}

        {syncError && (
          <>
            <XCircle className="h-12 w-12 text-red-500" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-red-600">
                Sync Failed
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {syncError}
              </p>
              {onRetry && (
                <Button onClick={onRetry} className="mt-4">
                  Try Again
                </Button>
              )}
            </div>
          </>
        )}

        {syncComplete && !syncing && !syncError && (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-green-600">
                Sync Complete!
              </h3>
              <p className="text-sm text-muted-foreground">
                Your Shopify data is ready to view.
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
