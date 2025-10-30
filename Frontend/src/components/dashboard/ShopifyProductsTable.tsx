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
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import { ShopifyProduct } from "@/hooks/useShopifyData";

interface ShopifyProductsTableProps {
  products: ShopifyProduct[];
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 10;
const MAX_PAGES = 10;

export const ShopifyProductsTable = ({
  products,
  isLoading = false,
}: ShopifyProductsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Limit to first 100 items (10 pages × 10 items)
  const limitedProducts = products.slice(0, ITEMS_PER_PAGE * MAX_PAGES);

  // Pagination logic
  const totalPages = Math.ceil(limitedProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = limitedProducts.slice(startIndex, endIndex);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status badge styling
  const getStatusStyle = (status: string) => {
    const statusUpper = status?.toUpperCase() || "ACTIVE";
    if (statusUpper === "ACTIVE") {
      return "bg-green-500/10 text-green-700 border-green-500/20";
    } else if (statusUpper === "DRAFT") {
      return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    } else if (statusUpper === "ARCHIVED") {
      return "bg-red-500/10 text-red-700 border-red-500/20";
    }
    return "bg-gray-500/10 text-gray-700 border-gray-500/20";
  };

  // Format status text
  const formatStatus = (status: string) => {
    if (!status) return "Active";
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No products found. Connect your Shopify store to view products.
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
            <h3 className="text-lg font-semibold">Shopify Products</h3>
            <p className="text-sm text-muted-foreground">
              {products.length} total products • Showing {startIndex + 1}-
              {Math.min(endIndex, limitedProducts.length)} of first{" "}
              {limitedProducts.length}
            </p>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Product</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Vendor</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">
                  Variants
                </TableHead>
                <TableHead className="font-semibold">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentProducts.map((product) => (
                <TableRow
                  key={product.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {product.image?.src ? (
                        <img
                          src={product.image.src}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <span>{product.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {product.product_type || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.vendor || "N/A"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(
                        product.status || ""
                      )}`}
                    >
                      {formatStatus(product.status || "Active")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {product.variants?.length || 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(product.created_at)}
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
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Total Products</p>
            <p className="text-lg font-semibold">{products.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-semibold text-green-600">
              {
                products.filter(
                  (p) => (p.status?.toUpperCase() || "ACTIVE") === "ACTIVE"
                ).length
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Variants</p>
            <p className="text-lg font-semibold">
              {products.reduce((sum, p) => sum + (p.variants?.length || 0), 0)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
