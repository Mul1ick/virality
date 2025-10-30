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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
  const formatStatus = (status: string) => {
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
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Shopify Orders</h3>
            <p className="text-sm text-muted-foreground">
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
              {currentOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium">{order.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.created_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.email || "Guest"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(order.total_price || "0")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getFinancialStatusStyle(
                        order.financial_status
                      )}`}
                    >
                      {formatStatus(order.financial_status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getFulfillmentStatusStyle(
                        order.fulfillment_status
                      )}`}
                    >
                      {formatStatus(order.fulfillment_status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {order.line_items?.length || 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
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
                  .reduce((sum, o) => sum + parseFloat(o.total_price || "0"), 0)
                  .toString()
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid Orders</p>
            <p className="text-lg font-semibold text-green-600">
              {
                orders.filter(
                  (o) => o.financial_status?.toUpperCase() === "PAID"
                ).length
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fulfilled</p>
            <p className="text-lg font-semibold">
              {
                orders.filter(
                  (o) => o.fulfillment_status?.toUpperCase() === "FULFILLED"
                ).length
              }
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
