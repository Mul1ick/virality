import { useState } from "react";
import { Card } from "@/components/ui/card";
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
import { ShopifyCustomer } from "@/hooks/useShopifyData";

interface ShopifyCustomersTableProps {
  customers: ShopifyCustomer[];
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 10;
const MAX_PAGES = 10;

export const ShopifyCustomersTable = ({
  customers,
  isLoading = false,
}: ShopifyCustomersTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Limit to first 100 items (10 pages × 10 items)
  const limitedCustomers = customers.slice(0, ITEMS_PER_PAGE * MAX_PAGES);

  // Pagination logic
  const totalPages = Math.ceil(limitedCustomers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentCustomers = limitedCustomers.slice(startIndex, endIndex);

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

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </Card>
    );
  }

  if (customers.length === 0) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No customers found. Connect your Shopify store to view customers.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Shopify Customers</h3>
            <p className="text-sm text-muted-foreground">
              {customers.length} total customers • Showing {startIndex + 1}-
              {Math.min(endIndex, limitedCustomers.length)} of first{" "}
              {limitedCustomers.length}
            </p>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold text-right">
                  Orders
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Total Spent
                </TableHead>
                <TableHead className="font-semibold">Customer Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium">
                    {customer.first_name || customer.last_name
                      ? `${customer.first_name || ""} ${
                          customer.last_name || ""
                        }`.trim()
                      : "Unknown"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.email}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {customer.orders_count || 0}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {customer.total_spent
                      ? formatCurrency(customer.total_spent)
                      : "$0.00"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(customer.created_at)}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Total Customers</p>
            <p className="text-lg font-semibold">{customers.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
            <p className="text-lg font-semibold">
              {customers.reduce((sum, c) => sum + (c.orders_count || 0), 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(
                customers
                  .reduce((sum, c) => sum + parseFloat(c.total_spent || "0"), 0)
                  .toString()
              )}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
