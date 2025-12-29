import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Lock, Sparkles, Calendar } from "lucide-react";

interface ShopifyTabProps {
  userId: string | null;
  isConnected: boolean;
  platformsLoaded: boolean;
}

export const ShopifyTab = ({
  userId,
  isConnected,
  platformsLoaded,
}: ShopifyTabProps) => {
  return (
    <div className="bg-card rounded-lg border p-6">
      <Card className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-500/20 backdrop-blur-sm overflow-hidden relative">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/5 to-green-500/0 animate-pulse"></div>

        <div className="relative z-10 p-12">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/30 rounded-full blur-2xl"></div>
                <div className="relative p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30">
                  <ShoppingCart className="h-16 w-16 text-green-500" />
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Lock className="h-5 w-5 text-green-500" />
                <h2 className="text-3xl font-bold text-foreground">
                  Shopify Integration
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold border border-green-500/30">
                <Sparkles className="h-4 w-4" />
                Coming Soon
              </div>
            </div>

            {/* Description */}
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
              We're working on bringing you comprehensive Shopify analytics
              including order tracking, revenue metrics, product performance,
              and customer insights.
            </p>

            {/* Features List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 text-left">
              <div className="flex items-start gap-3 p-4 bg-card/50 rounded-lg border border-border/50">
                <div className="p-2 bg-green-500/20 rounded-lg mt-0.5">
                  <Calendar className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">
                    Order Analytics
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Track orders, revenue, and fulfillment status
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-card/50 rounded-lg border border-border/50">
                <div className="p-2 bg-green-500/20 rounded-lg mt-0.5">
                  <Sparkles className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">
                    Product Insights
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Monitor inventory and product performance
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-card/50 rounded-lg border border-border/50">
                <div className="p-2 bg-green-500/20 rounded-lg mt-0.5">
                  <ShoppingCart className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">
                    Customer Data
                  </p>
                  <p className="text-sm text-muted-foreground">
                    View customer spending and order history
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-card/50 rounded-lg border border-border/50">
                <div className="p-2 bg-green-500/20 rounded-lg mt-0.5">
                  <Lock className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">
                    ROAS Tracking
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Calculate return on ad spend with revenue data
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-6">
              <Button
                size="lg"
                disabled
                className="bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed"
              >
                <Lock className="h-4 w-4 mr-2" />
                Integration Under Development
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Check back soon for updates on this feature
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// import { useState } from "react";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { ShopifyOrdersTable } from "@/components/dashboard/ShopifyOrdersTable";
// import { ShopifyProductsTable } from "@/components/dashboard/ShopifyProductsTable";
// import { ShopifyCustomersTable } from "@/components/dashboard/ShopifyCustomersTable";
// import { ShopifySyncStatus } from "@/components/dashboard/ShopifySyncStatus";
// import { ShoppingCart, RefreshCw, Calendar } from "lucide-react";
// import { useShopifyData } from "@/hooks/useShopifyData";

// interface ShopifyTabProps {
//   userId: string | null;
//   isConnected: boolean;
//   platformsLoaded: boolean;
// }

// export const ShopifyTab = ({
//   userId,
//   isConnected,
//   platformsLoaded,
// }: ShopifyTabProps) => {
//   const [isRefreshing, setIsRefreshing] = useState(false);

//   // Fetch orders, products, customers with auto-sync
//   const {
//     orders,
//     products,
//     customers,
//     loading,
//     error,
//     syncing,
//     syncComplete,
//     syncError,
//     checkAndSync,
//     refreshAll,
//   } = useShopifyData(userId, isConnected, platformsLoaded);

//   const hasData =
//     orders.length > 0 || products.length > 0 || customers.length > 0;

//   const handleRefresh = async () => {
//     console.log("🔄 [Shopify] Manual refresh clicked");
//     setIsRefreshing(true);
//     try {
//       await refreshAll();
//     } catch (e) {
//       console.error("❌ [Shopify] Refresh failed:", e);
//     } finally {
//       setIsRefreshing(false);
//     }
//   };

//   if (!isConnected) {
//     return (
//       <div className="bg-card rounded-lg border p-6">
//         <p className="text-muted-foreground text-center py-8">
//           Shopify not connected. Connect your Shopify store in the Profile page.
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-card rounded-lg border p-6">
//       <div className="flex items-center justify-between mb-6">
//         <div className="flex items-center gap-3">
//           <ShoppingCart className="h-6 w-6 text-green-600" />
//           <div>
//             <h2 className="text-2xl font-bold">Shopify Store Data</h2>
//             <p className="text-sm text-muted-foreground">
//               {orders.length} orders, {products.length} products,{" "}
//               {customers.length} customers
//             </p>
//           </div>
//         </div>

//         <Button
//           onClick={handleRefresh}
//           disabled={isRefreshing || !isConnected || syncing}
//           variant="outline"
//           size="sm"
//         >
//           <RefreshCw
//             className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
//           />
//           {isRefreshing ? "Refreshing..." : "Refresh"}
//         </Button>
//       </div>

//       {/* Sync Status - Shows during initial sync */}
//       <ShopifySyncStatus
//         syncing={syncing}
//         syncComplete={syncComplete}
//         syncError={syncError}
//         onRetry={checkAndSync}
//       />

//       {/* Show errors */}
//       {(error.orders || error.products || error.customers) && !syncing && (
//         <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
//           <p className="text-red-800 font-semibold">
//             Error loading Shopify data
//           </p>
//           <p className="text-red-600 text-sm">
//             {error.orders || error.products || error.customers}
//           </p>
//         </div>
//       )}

//       {/* Main Content - Only show after sync is complete */}
//       {syncComplete && !syncing && (
//         <>
//           {/* Tabs for Orders, Products, Customers */}
//           {hasData ? (
//             <Tabs defaultValue="orders" className="w-full">
//               <TabsList className="mb-6">
//                 <TabsTrigger value="orders">
//                   Orders {orders.length > 0 && `(${orders.length})`}
//                 </TabsTrigger>
//                 <TabsTrigger value="products">
//                   Products {products.length > 0 && `(${products.length})`}
//                 </TabsTrigger>
//                 <TabsTrigger value="customers">
//                   Customers {customers.length > 0 && `(${customers.length})`}
//                 </TabsTrigger>
//               </TabsList>

//               <TabsContent value="orders">
//                 <ShopifyOrdersTable
//                   orders={orders}
//                   isLoading={loading.orders}
//                 />
//               </TabsContent>

//               <TabsContent value="products">
//                 <ShopifyProductsTable
//                   products={products}
//                   isLoading={loading.products}
//                 />
//               </TabsContent>

//               <TabsContent value="customers">
//                 <ShopifyCustomersTable
//                   customers={customers}
//                   isLoading={loading.customers}
//                 />
//               </TabsContent>
//             </Tabs>
//           ) : !loading.orders &&
//             !loading.products &&
//             !loading.customers &&
//             !error.orders &&
//             !error.products &&
//             !error.customers ? (
//             <p className="text-muted-foreground text-center py-8">
//               No Shopify data available. Try refreshing or check your store.
//             </p>
//           ) : null}
//         </>
//       )}
//     </div>
//   );
// };
