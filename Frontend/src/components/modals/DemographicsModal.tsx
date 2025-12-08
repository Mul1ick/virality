import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MetaDemographicsChart, DemographicData } from "@/components/dashboard/MetaDemographicsChart";
import { Loader2, Users } from "lucide-react";
import apiClient from "@/lib/api";

interface DemographicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: "campaign" | "adset" | "ad";
  itemId: string | null;
  itemName: string;
}

export const DemographicsModal = ({
  isOpen,
  onClose,
  level,
  itemId,
  itemName,
}: DemographicsModalProps) => {
  const [data, setData] = useState<DemographicData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && itemId) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          // Use the specific /data/ path we fixed earlier
          const res = await apiClient.get(`/meta/demographics/data/${level}/${itemId}`);
          
          if (res.data.data && res.data.data.length > 0) {
            setData(res.data.data);
          } else {
            setData([]); 
          }
        } catch (e: any) {
          console.error("Failed to load demographics", e);
          setError("Could not load demographic data.");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, itemId, level]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Audience Demographics
          </DialogTitle>
          <DialogDescription>
            Lifetime breakdown for <span className="font-semibold text-foreground">{itemName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 min-h-[400px]">
          {loading ? (
            <div className="flex h-[350px] items-center justify-center flex-col gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Aggregating historical data...</p>
            </div>
          ) : error ? (
             <div className="flex h-[350px] items-center justify-center text-destructive">
               {error}
             </div>
          ) : (
            <MetaDemographicsChart 
              data={data} 
              isLoading={false} 
              metric="impressions" // Can be changed to "reach" or "spend"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};