// components/modals/GoogleAccountSelectionModal.tsx
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
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import axios from "axios";

interface Account {
  id: string;
  name?: string;
  descriptiveName?: string;
  isManager?: boolean;
}

interface GoogleAccountSelectionModalProps {
  isOpen: boolean;
  userId: string;
  onComplete: (managerId: string, customerId: string) => void;
  onCancel?: () => void;
}

export const GoogleAccountSelectionModal = ({
  isOpen,
  userId,
  onComplete,
  onCancel,
}: GoogleAccountSelectionModalProps) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Manager accounts
  const [managerAccounts, setManagerAccounts] = useState<Account[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");

  // Step 2: Client accounts
  const [clientAccounts, setClientAccounts] = useState<Account[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Fetch manager accounts on mount
  useEffect(() => {
    if (isOpen && userId) {
      fetchManagerAccounts();
    }
  }, [isOpen, userId]);

  const fetchManagerAccounts = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");

      const response = await axios.get(
        `${backendUrl}/google/accounts/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const accountsList = response.data.accounts || [];
      setManagerAccounts(accountsList);

      // Auto-select if only one manager account
      if (accountsList.length === 1) {
        setSelectedManagerId(accountsList[0].id);
      }
    } catch (e: any) {
      console.error("Failed to fetch Google accounts:", e);
      setError(
        e.response?.data?.detail || "Failed to load Google Ads accounts"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManagerNext = async () => {
    if (!selectedManagerId) {
      setError("Please select a manager account");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");

      // Select manager and get client accounts
      const response = await axios.post(
        `${backendUrl}/google/select-manager/${userId}`,
        {
          manager_id: selectedManagerId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const clients = response.data.client_accounts || [];

      if (clients.length === 0) {
        setError("No client accounts found for this manager");
        setSaving(false);
        return;
      }

      setClientAccounts(clients);

      // Auto-select if only one client
      if (clients.length === 1) {
        setSelectedClientId(clients[0].id);
      }

      // Move to step 2
      setStep(2);
    } catch (e: any) {
      console.error("Failed to select manager:", e);
      setError(e.response?.data?.detail || "Failed to get client accounts");
    } finally {
      setSaving(false);
    }
  };

  const handleClientComplete = async () => {
    if (!selectedClientId) {
      setError("Please select a client account");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");

      // Just save the client_customer_id to the existing connection
      // The manager was already saved in handleManagerNext
      await axios.post(
        `${backendUrl}/google/save-client/${userId}`,
        {
          client_customer_id: selectedClientId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Success - return both IDs
      onComplete(selectedManagerId, selectedClientId);
    } catch (e: any) {
      console.error("Failed to save client:", e);
      setError(e.response?.data?.detail || "Failed to save client selection");
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔴 Select Google Ads Account
            <span className="text-sm font-normal text-muted-foreground">
              (Step {step} of 2)
            </span>
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "First, choose your Manager (MCC) account"
              : "Now, select which client account to connect"}
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

          {/* Step 1: Manager Accounts */}
          {!loading && step === 1 && managerAccounts.length > 0 && (
            <RadioGroup
              value={selectedManagerId}
              onValueChange={setSelectedManagerId}
              className="space-y-3"
            >
              {managerAccounts.map((account) => (
                <div
                  key={account.id}
                  className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-accent/50 ${
                    selectedManagerId === account.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => setSelectedManagerId(account.id)}
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
                      {account.name ||
                        account.descriptiveName ||
                        "Unnamed Account"}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Manager ID: {account.id}
                    </p>
                    {account.isManager && (
                      <div className="flex items-center gap-1 mt-2">
                        <CheckCircle2 className="h-3 w-3 text-blue-500" />
                        <span className="text-xs text-blue-500">
                          Manager Account (MCC)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* Step 2: Client Accounts */}
          {!loading && step === 2 && clientAccounts.length > 0 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>Selected Manager:</strong> {selectedManagerId}
                </p>
              </div>

              <RadioGroup
                value={selectedClientId}
                onValueChange={setSelectedClientId}
                className="space-y-3"
              >
                {clientAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-accent/50 ${
                      selectedClientId === account.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => setSelectedClientId(account.id)}
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
                        {account.name || `Client ${account.id}`}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Client ID: {account.id}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* No Accounts */}
          {!loading &&
            !error &&
            ((step === 1 && managerAccounts.length === 0) ||
              (step === 2 && clientAccounts.length === 0)) && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold mb-1">No Accounts Found</p>
                <p className="text-sm text-muted-foreground">
                  {step === 1
                    ? "No Google Ads accounts are associated with your login."
                    : "No client accounts found under this manager."}
                </p>
              </div>
            )}
        </div>

        {/* Footer Actions */}
        {!loading && (
          <div className="flex justify-between gap-3">
            <div>
              {step === 2 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setSelectedClientId("");
                    setError(null);
                  }}
                  disabled={saving}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              {onCancel && (
                <Button variant="outline" onClick={onCancel} disabled={saving}>
                  Cancel
                </Button>
              )}

              {step === 1 && managerAccounts.length > 0 && (
                <Button
                  onClick={handleManagerNext}
                  disabled={!selectedManagerId || saving}
                  className="min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}

              {step === 2 && clientAccounts.length > 0 && (
                <Button
                  onClick={handleClientComplete}
                  disabled={!selectedClientId || saving}
                  className="min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Complete"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
