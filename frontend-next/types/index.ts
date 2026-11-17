export type RoleName =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'INVENTORY_MANAGER'
  | 'WAREHOUSE_MANAGER'
  | 'STAFF'
  | 'VIEWER';

export interface User {
  id: number;
  email: string;
  name: string;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  role: RoleName;
  permissions: string[];
  avatarUrl: string | null;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  _count?: { products: number };
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  manager?: { id: number; name: string; email: string };
  stocks?: WarehouseStock[];
}

export interface WarehouseStock {
  id: number;
  warehouseId: number;
  productId: number;
  quantity: string | number;
  reservedQuantity: string | number;
  warehouse?: Warehouse;
  product?: Product;
}

export interface Product {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: number;
  brand: string | null;
  unitOfMeasure: string;
  costPrice: string | number;
  sellingPrice: string | number;
  minStockLevel: string | number;
  maxStockLevel: string | number | null;
  reorderQuantity: string | number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  category?: Category;
  stocks?: WarehouseStock[];
}

export interface Supplier {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  taxId: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  _count?: { purchaseOrders: number; products: number };
}

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  city: string | null;
  country: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  _count?: { salesOrders: number };
}

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  supplierId: number;
  warehouseId: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  subtotal: string | number;
  taxAmount: string | number;
  discountAmount: string | number;
  total: string | number;
  notes: string | null;
  createdAt: string;
  supplier?: Supplier;
  warehouse?: Warehouse;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: number;
  purchaseOrderId: number;
  productId: number;
  quantity: string | number;
  receivedQty: string | number;
  unitPrice: string | number;
  lineTotal: string | number;
  product?: Product;
}

export interface SalesOrder {
  id: number;
  orderNumber: string;
  customerId: number;
  warehouseId: number;
  status: 'DRAFT' | 'CONFIRMED' | 'RESERVED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED' | 'RETURNED';
  subtotal: string | number;
  taxAmount: string | number;
  discountAmount: string | number;
  total: string | number;
  notes: string | null;
  createdAt: string;
  customer?: Customer;
  warehouse?: Warehouse;
  items?: SalesOrderItem[];
}

export interface SalesOrderItem {
  id: number;
  salesOrderId: number;
  productId: number;
  quantity: string | number;
  fulfilledQty: string | number;
  reservedQty: string | number;
  unitPrice: string | number;
  lineTotal: string | number;
  product?: Product;
}

export interface StockMovement {
  id: number;
  type: string;
  productId: number;
  warehouseId: number;
  quantity: string | number;
  resultingQuantity: string | number;
  unitCost: string | number | null;
  notes: string | null;
  createdAt: string;
  product?: { name: string; sku: string };
  warehouse?: { name: string; code: string };
  createdBy?: { name: string };
}

export interface DashboardOverview {
  totalProducts: number;
  totalCategories: number;
  totalStockQuantity: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalSuppliers: number;
  totalCustomers: number;
  totalPurchaseOrders: number;
  totalSalesOrders: number;
}

export interface DashboardAnalytics {
  categoryDistribution: Array<{
    categoryId: number;
    categoryName: string;
    totalQuantity: number;
  }>;
  warehouseDistribution: Array<{
    warehouseId: number;
    code: string;
    name: string;
    totalQuantity: number;
    totalValue: number;
  }>;
  lowStockAlerts: Array<{
    id: number;
    name: string;
    sku: string;
    currentStock: number;
    minStockLevel: number;
    reorderQuantity: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    purchases: number;
    sales: number;
  }>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}
