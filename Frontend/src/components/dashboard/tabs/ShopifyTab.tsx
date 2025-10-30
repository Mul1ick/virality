import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ShopifyOrdersTable } from "@/components/dashboard/ShopifyOrdersTable";
import { ShopifyProductsTable } from "@/components/dashboard/ShopifyProductsTable";
import { ShopifyCustomersTable } from "@/components/dashboard/ShopifyCustomersTable";
import { ShoppingCart, RefreshCw } from "lucide-react";
import { DateRange } from "react-day-picker";
import {
  ShopifyOrder,
  ShopifyProduct,
  ShopifyCustomer,
} from "@/hooks/useShopifyData";

interface ShopifyTabProps {
  orders: ShopifyOrder[];
  products: ShopifyProduct[];
  customers: ShopifyCustomer[];
  loading: {
    orders: boolean;
    products: boolean;
    customers: boolean;
  };
  isConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  dateRange: string;
  customRange?: DateRange;
}

export const ShopifyTab = ({
  orders,
  products,
  customers,
  loading,
  isConnected,
  isRefreshing,
  onRefresh,
  dateRange,
  customRange,
}: ShopifyTabProps) => {
  const hasData =
    orders.length > 0 || products.length > 0 || customers.length > 0;

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold">Shopify Store Data</h2>
        </div>
        <Button
          onClick={onRefresh}
          disabled={isRefreshing || !isConnected}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      {hasData ? (
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="orders">
              Orders {orders.length > 0 && `(${orders.length})`}
            </TabsTrigger>
            <TabsTrigger value="products">
              Products {products.length > 0 && `(${products.length})`}
            </TabsTrigger>
            <TabsTrigger value="customers">
              Customers {customers.length > 0 && `(${customers.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <ShopifyOrdersTable orders={orders} isLoading={loading.orders} />
          </TabsContent>

          <TabsContent value="products">
            <ShopifyProductsTable
              products={products}
              isLoading={loading.products}
            />
          </TabsContent>

          <TabsContent value="customers">
            <ShopifyCustomersTable
              customers={customers}
              isLoading={loading.customers}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-muted-foreground">
          {isConnected
            ? "No Shopify data available. Try refreshing or check your store."
            : "Shopify not connected. Connect your Shopify store in the Profile page."}
        </p>
      )}
    </div>
  );
};
