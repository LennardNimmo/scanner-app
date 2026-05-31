export type Product = {
  id: string;
  gtin: string;
  brand?: string;
  name: string;
  category?: string;
  image_url?: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
  min_price_cents?: number;
};

export type MerchantLineItem = {
  product: Product;
  quantity: number;
  unit_price_cents: number;
  line_subtotal_cents: number;
  discount_cents: number;
  line_total_cents: number;
  applied_promotions?: Array<{
    id?: string;
    title?: string;
    promotion_type?: string;
  }>;
  product_url?: string;
  affiliate_url?: string;
};

export type MerchantLine = {
  merchant: {
    id: string;
    name: string;
    company_name?: string;
    domain?: string;
    affiliate_network?: string;
    logo_url?: string;
  };
  items: MerchantLineItem[];
  product_subtotal_cents: number;
  promotion_discount_cents: number;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  carrier?: string;
  delivery_days_max: number;
  redirect_path?: string;
};

export type Optimization = {
  id: string;
  checkout_mode: 'affiliate_redirects' | string;
  products_cents: number;
  products_before_discount_cents?: number;
  promotion_discount_cents?: number;
  shipping_cents: number;
  total_cents: number;
  selected_merchants_count?: number;
  selected_sellers_count?: number;
  merchant_lines: MerchantLine[];
  seller_lines?: MerchantLine[];
  generated_at?: string;
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
