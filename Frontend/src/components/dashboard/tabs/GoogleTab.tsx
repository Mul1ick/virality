// components/dashboard/tabs/GoogleTab.tsx
import { CreativeGallery } from "@/components/dashboard/CreativeGallery";
import { Search } from "lucide-react";

interface GoogleTabProps {
  campaigns: any[];
  isConnected: boolean;
}

export const GoogleTab = ({ campaigns, isConnected }: GoogleTabProps) => {
  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center gap-3 mb-4">
        <Search className="h-6 w-6 text-red-600" />
        <h2 className="text-2xl font-bold">Google Campaigns</h2>
      </div>
      {campaigns.length > 0 ? (
        <>
          <p className="text-muted-foreground mb-4">
            {campaigns.length} campaigns found
          </p>
          <CreativeGallery campaigns={campaigns} />
        </>
      ) : (
        <p className="text-muted-foreground">
          {isConnected
            ? "No Google campaigns found. Check your Google Ads account."
            : "Google not connected. Connect your Google Ads account in the Profile page."}
        </p>
      )}
    </div>
  );
};
