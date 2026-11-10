// Mirrors the API contract in docs/ARCHITECTURE.md (camelCase JSON).

export type Role = "customer" | "admin";

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  documentId: string | null;
  role: Role;
  createdAt: string;
}

export type Availability = "in_stock" | "low_stock" | "out_of_stock";
export type WeaveGrade = "fino" | "superfino" | "extrafino";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

export interface Color {
  id: number;
  name: string;
  hex: string;
}

export interface Size {
  id: number;
  code: string;
  label: string;
  headCmMin: number;
  headCmMax: number;
}

export interface ProductCardData {
  id: number;
  slug: string;
  name: string;
  shortDescription: string;
  priceCop: number;
  compareAtPriceCop: number | null;
  imageUrl: string | null;
  imageAlt: string | null;
  category: { slug: string; name: string };
  artisan: { fullName: string; municipality: string };
  weaveGrade: WeaveGrade;
  colors: Color[];
  totalStock: number;
  availability: Availability;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
}

export interface Artisan {
  id: number;
  fullName: string;
  municipality: string;
  department: string;
  craft: string;
  bio: string | null;
  yearsExperience: number | null;
  photoUrl: string | null;
}

export interface Variant {
  id: number;
  sku: string;
  sizeCode: string;
  colorId: number;
  colorName: string;
  colorHex: string;
  stock: number;
  availability: Availability;
}

export interface ProductDetail extends ProductCardData {
  sku: string;
  description: string;
  fiber: string;
  weavingHours: number;
  brimCm: number;
  images: { url: string; alt: string | null }[];
  sizes: { code: string; label: string; headCmMin: number; headCmMax: number }[];
  variants: Variant[];
  artisan: Artisan;
  related: ProductCardData[];
}

export interface ProductFacets {
  categories: { slug: string; name: string; count: number }[];
  colors: { id: number; name: string; hex: string; count: number }[];
  sizes: { code: string; count: number }[];
  weaves: { value: WeaveGrade; count: number }[];
  priceMin: number | null;
  priceMax: number | null;
}

export interface ProductList {
  items: ProductCardData[];
  total: number;
  page: number;
  pageSize: number;
  facets: ProductFacets;
}

export interface ArtisanWithProducts extends Artisan {
  products: ProductCardData[];
}

export interface Totals {
  totalItemsCop: number;
  subtotalCop: number;
  taxCop: number;
  shippingCop: number;
  totalCop: number;
  freeShippingFromCop?: number;
}

export interface CartItem {
  id: number;
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  sizeCode: string;
  colorName: string;
  colorHex: string;
  unitPriceCop: number;
  quantity: number;
  lineTotalCop: number;
  stock: number;
  availability: Availability;
}

export interface Cart {
  items: CartItem[];
  totals: Totals;
  itemCount: number;
}

export interface GuestCartLine {
  variantId: number;
  quantity: number;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "approved" | "declined" | "failed";

export interface ShippingInput {
  fullName: string;
  phone: string;
  addressLine: string;
  addressExtra?: string;
  city: string;
  department: string;
  postalCode: string;
  notes?: string;
}

export interface ShippingInfo {
  fullName: string;
  phone: string;
  addressLine: string;
  addressExtra: string | null;
  city: string;
  department: string;
  postalCode: string;
  notes: string | null;
}

export interface OrderItem {
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  sizeCode: string;
  colorName: string;
  unitPriceCop: number;
  quantity: number;
  lineTotalCop: number;
}

export interface OrderHistoryEntry {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface OrderPayment {
  reference: string;
  status: PaymentStatus;
  amountCop: number;
  createdAt: string;
}

export interface Order {
  id: number;
  number: string;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
  totals: Totals;
  shipping: ShippingInfo;
  history: OrderHistoryEntry[];
  payments: OrderPayment[];
}

export interface OrderSummary {
  id: number;
  number: string;
  createdAt: string;
  status: OrderStatus;
  totalCop: number;
  itemCount: number;
  firstItemImageUrl: string | null;
}

export interface CheckoutResult {
  order: Order;
  payment: { reference: string; redirectUrl: string };
}

export interface PaymentInfo {
  reference: string;
  status: PaymentStatus;
  amountCop: number;
  orderNumber: string;
  orderId: number;
}

export interface SimulateResult {
  payment: { reference: string; status: PaymentStatus; amountCop?: number };
  order: Order;
}

// ---- Admin (used by the admin panel) ----

export interface AdminSummary {
  ordersCount: number;
  paidOrdersCount: number;
  revenueCop: number;
  averageOrderCop: number;
  topProducts: {
    productId: number;
    name: string;
    unitsSold: number;
    revenueCop: number;
    imageUrl: string | null;
  }[];
  salesByDay: { date: string; revenueCop: number; orders: number }[];
  lowStock: {
    variantId: number;
    productName: string;
    sizeCode: string;
    colorName: string;
    stock: number;
  }[];
  ordersByStatus: Partial<Record<OrderStatus, number>>;
}

export interface AdminProductRow {
  id: number;
  sku: string;
  slug: string;
  name: string;
  priceCop: number;
  categoryName: string;
  isActive: boolean;
  totalStock: number;
  variantCount: number;
  imageUrl: string | null;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  sku: string;
  shortDescription: string;
  description: string;
  priceCop: number;
  compareAtPriceCop?: number | null;
  categoryId: number;
  artisanId: number;
  weaveGrade: WeaveGrade;
  weavingHours: number;
  brimCm: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  isFeatured: boolean;
  images: { url: string; alt: string }[];
  variants: { sizeCode: string; colorId: number; stock: number }[];
}

export interface AdminProductDetail extends ProductDetail {
  isFeatured: boolean;
  isActive: boolean;
  categoryId: number;
  artisanId: number;
}

export interface InventoryRow {
  variantId: number;
  sku: string;
  productId: number;
  productName: string;
  sizeCode: string;
  colorName: string;
  colorHex: string;
  stock: number;
  isLow: boolean;
}

export interface AdminOrderSummary extends OrderSummary {
  customerName: string;
  customerEmail: string;
}

export interface AdminOrder extends Order {
  customer: { id: number; fullName: string; email: string; phone: string | null };
  allowedTransitions: OrderStatus[];
}

export interface AdminProductList {
  items: AdminProductRow[];
  total: number;
}

export interface AdminOrderList {
  items: AdminOrderSummary[];
  total: number;
}

export interface InventoryMovement {
  id: number;
  variantId: number;
  delta: number;
  reason: "initial" | "purchase" | "adjustment" | "restock" | "cancellation";
  note: string | null;
  userId: number | null;
  userName: string | null;
  orderId: number | null;
  orderNumber: string | null;
  createdAt: string;
}

export interface CategoryOption {
  id: number;
  name: string;
  slug: string;
}

export interface ArtisanOption {
  id: number;
  fullName: string;
  municipality: string;
}
