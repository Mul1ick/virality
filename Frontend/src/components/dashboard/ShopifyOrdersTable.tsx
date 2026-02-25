import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShopifyOrder } from "@/hooks/useShopifyData";

interface ShopifyOrdersTableProps {
  orders: ShopifyOrder[];
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 10;
const MAX_PAGES = 10;

export const ShopifyOrdersTable = ({
  orders,
  isLoading = false,
}: ShopifyOrdersTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Limit to first 100 items (10 pages × 10 items)
  const limitedOrders = orders.slice(0, ITEMS_PER_PAGE * MAX_PAGES);

  // Pagination logic
  const totalPages = Math.ceil(limitedOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentOrders = limitedOrders.slice(startIndex, endIndex);

  // Format currency
  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "Invalid Date";
    }
  };

  // Get financial status badge styling
  const getFinancialStatusStyle = (status: string) => {
    const statusUpper = status?.toUpperCase() || "";
    if (statusUpper === "PAID") {
      return "bg-green-500/10 text-green-700 border-green-500/20";
    } else if (statusUpper === "PENDING") {
      return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    } else if (statusUpper === "REFUNDED") {
      return "bg-red-500/10 text-red-700 border-red-500/20";
    }
    return "bg-gray-500/10 text-gray-700 border-gray-500/20";
  };

  // Get fulfillment status badge styling
  const getFulfillmentStatusStyle = (status: string) => {
    const statusUpper = status?.toUpperCase() || "";
    if (statusUpper === "FULFILLED") {
      return "bg-green-500/10 text-green-700 border-green-500/20";
    } else if (statusUpper === "PARTIAL") {
      return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    } else if (statusUpper === "UNFULFILLED" || !status) {
      return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
    return "bg-gray-500/10 text-gray-700 border-gray-500/20";
  };

  // Format status text
  const formatStatus = (status: string | undefined) => {
    if (!status) return "Unfulfilled";
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No orders found. Connect your Shopify store to view orders.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Shopify Orders</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {orders.length} total orders • Showing {startIndex + 1}-
              {Math.min(endIndex, limitedOrders.length)} of first{" "}
              {limitedOrders.length}
            </p>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Order #</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold text-right">
                  Amount
                </TableHead>
                <TableHead className="font-semibold">Payment</TableHead>
                <TableHead className="font-semibold">Fulfillment</TableHead>
                <TableHead className="font-semibold text-right">
                  Items
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentOrders.map((order) => {
                // Extract values with fallbacks
                const orderName = order.name || order.orderNumber || order.id;
                const orderDate = order.created_at || order.createdAt;
                const customerEmail =
                  order.email || order.customer?.email || "Guest";

                // Try ALL possible price fields
                const totalPrice =
                  order.total_price ||
                  order.totalPrice ||
                  order.currentTotalPrice?.amount ||
                  (order as any).totalPriceSet?.shopMoney?.amount ||
                  (order as any).total ||
                  (order as any).amount ||
                  (order as any).price ||
                  (order as any).subtotal_price ||
                  "0";

                const financialStatus =
                  order.financial_status ||
                  order.financialStatus ||
                  order.displayFinancialStatus ||
                  "";

                const fulfillmentStatus =
                  order.fulfillment_status ||
                  order.fulfillmentStatus ||
                  order.displayFulfillmentStatus ||
                  "";

                const lineItemsCount =
                  order.line_items?.length ||
                  (Array.isArray(order.lineItems)
                    ? order.lineItems.length
                    : order.lineItems?.edges?.length) ||
                  0;

                return (
                  <TableRow
                    key={order.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">{orderName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(orderDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customerEmail}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(totalPrice)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getFinancialStatusStyle(
                          financialStatus
                        )}`}
                      >
                        {formatStatus(financialStatus)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getFulfillmentStatusStyle(
                          fulfillmentStatus
                        )}`}
                      >
                        {formatStatus(fulfillmentStatus)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {lineItemsCount}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t gap-2">
            <p className="text-xs sm:text-sm text-muted-foreground shrink-0">
              Page {currentPage}/{totalPages}
            </p>
            <div className="flex gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
            <p className="text-lg font-semibold">{orders.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(
                orders
                  .reduce((sum, o) => {
                    const price =
                      o.total_price ||
                      o.totalPrice ||
                      o.currentTotalPrice?.amount ||
                      (o as any).totalPriceSet?.shopMoney?.amount ||
                      (o as any).total ||
                      (o as any).amount ||
                      "0";
                    return sum + parseFloat(price);
                  }, 0)
                  .toString()
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid Orders</p>
            <p className="text-lg font-semibold text-green-600">
              {
                orders.filter((o) => {
                  const status =
                    o.financial_status ||
                    o.financialStatus ||
                    o.displayFinancialStatus ||
                    "";
                  return status.toUpperCase() === "PAID";
                }).length
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fulfilled</p>
            <p className="text-lg font-semibold">
              {
                orders.filter((o) => {
                  const status =
                    o.fulfillment_status ||
                    o.fulfillmentStatus ||
                    o.displayFulfillmentStatus ||
                    "";
                  return status.toUpperCase() === "FULFILLED";
                }).length
              }
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
