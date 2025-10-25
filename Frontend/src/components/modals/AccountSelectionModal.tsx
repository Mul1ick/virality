// components/modals/AccountSelectionModal.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";

interface Account {
  id: string;
  name: string;
  business_name?: string;
  account_status?: number;
}

interface AccountSelectionModalProps {
  isOpen: boolean;
  platform: "meta" | "google";
  userId: string;
  onComplete: (accountId: string) => void;
  onCancel?: () => void;
}

export const AccountSelectionModal = ({
  isOpen,
  platform,
  userId,
  onComplete,
  onCancel,
}: AccountSelectionModalProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Fetch accounts when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchAccounts();
    }
  }, [isOpen, userId, platform]);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem("access_token");

      const endpoint =
        platform === "meta"
          ? `${backendUrl}/meta/ad-accounts`
          : `${backendUrl}/google/ad-accounts`;

      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const accountsList = response.data.accounts || [];

      setAccounts(accountsList);

      // Auto-select if only one account
      if (accountsList.length === 1) {
        setSelectedAccountId(accountsList[0].id);
      }
    } catch (e: any) {
      console.error(`Failed to fetch ${platform} accounts:`, e);
      setError(
        e.response?.data?.detail ||
          `Failed to load ${
            platform === "meta" ? "Meta" : "Google Ads"
          } accounts`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAccountId) {
      setError("Please select an account");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
      if (!selectedAccount) throw new Error("Account not found");

      // Get JWT token from localStorage
      const token = localStorage.getItem("access_token");

      const endpoint =
        platform === "meta"
          ? `${backendUrl}/meta/select-account`
          : `${backendUrl}/google/select-account`;

      const payload = {
        ad_account_id: selectedAccountId,
        ad_account_name: selectedAccount.name,
      };

      await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Success - call onComplete with the selected account ID
      onComplete(selectedAccountId);
    } catch (e: any) {
      console.error(`Failed to save ${platform} account:`, e);
      setError(e.response?.data?.detail || "Failed to save account selection");
      setSaving(false);
    }
  };

  const platformName = platform === "meta" ? "Meta Ads" : "Google Ads";

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {platform === "meta" ? "🔵" : "🔴"} Select {platformName} Account
          </DialogTitle>
          <DialogDescription>
            Choose which ad account you'd like to connect to your dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading your accounts...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Error</p>
                  <p className="text-sm text-destructive/90">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* No Accounts */}
          {!loading && !error && accounts.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold mb-1">No Accounts Found</p>
              <p className="text-sm text-muted-foreground">
                No {platformName} accounts are associated with your login.
              </p>
            </div>
          )}

          {/* Account List */}
          {!loading && !error && accounts.length > 0 && (
            <RadioGroup
              value={selectedAccountId}
              onValueChange={setSelectedAccountId}
              className="space-y-3"
            >
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-accent/50 ${
                    selectedAccountId === account.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => setSelectedAccountId(account.id)}
                >
                  <RadioGroupItem
                    value={account.id}
                    id={account.id}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={account.id}
                      className="cursor-pointer font-medium"
                    >
                      {account.name}
                    </Label>
                    {account.business_name && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {account.business_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: {account.id}
                    </p>
                    {account.account_status === 1 && (
                      <div className="flex items-center gap-1 mt-2">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        <span className="text-xs text-success">Active</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        {/* Footer Actions */}
        {!loading && accounts.length > 0 && (
          <div className="flex justify-end gap-3">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!selectedAccountId || saving}
              className="min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
