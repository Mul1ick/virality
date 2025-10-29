import { ShoppingCart } from "lucide-react";
import { DateRange } from "react-day-picker";

interface ShopifyTabProps {
  orders: any[];
  isConnected: boolean;
  dateRange: string;
  customRange?: DateRange;
}

export const ShopifyTab = ({
  orders,
  isConnected,
  dateRange,
  customRange,
}: ShopifyTabProps) => {
  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center gap-3 mb-4">
        <ShoppingCart className="h-6 w-6 text-green-600" />
        <h2 className="text-2xl font-bold">Shopify Orders</h2>
      </div>
      {orders.length > 0 ? (
        <>
          <p className="text-muted-foreground mb-4">
            {orders.length} orders found
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Order ID</th>
                  <th className="text-left p-3 font-semibold">Date</th>
                  <th className="text-left p-3 font-semibold">Amount</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-3">{order.id || `#${idx + 1}`}</td>
                    <td className="p-3">{order.date || "N/A"}</td>
                    <td className="p-3">{order.amount || "N/A"}</td>
                    <td className="p-3">{order.status || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">
          {isConnected
            ? "No Shopify orders found."
            : "Shopify not connected. Connect your Shopify store in the Profile page."}
        </p>
      )}
    </div>
  );
};
