export type Product = {
  id: string;
  gtin: string;
  brand: string;
  name: string;
  category: string;
  image_url?: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
  min_price_cents?: number;
};

export type SellerLine = {
  seller: {
    id: string;
    company_name: string;
    commission_rate: number;
  };
  items: Array<{
    product: Product;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
  }>;
  subtotal_cents: number;
  shipping_cents: number;
  carrier: string;
  delivery_days_max: number;
};

export type Optimization = {
  id: string;
  products_cents: number;
  shipping_cents: number;
  total_cents: number;
  selected_sellers_count: number;
  seller_lines: SellerLine[];
};

export type Shipment = {
  id: string;
  carrier: string;
  tracking_code: string;
  description: string;
  status: string;
  eta?: string;
  seller_name?: string;
};
