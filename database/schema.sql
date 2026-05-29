CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  gtin TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY,
  company_name TEXT NOT NULL,
  legal_entity_name TEXT,
  vat_number TEXT,
  chamber_of_commerce_number TEXT,
  support_email TEXT,
  return_address TEXT,
  payout_provider TEXT NOT NULL DEFAULT 'stripe',
  payout_account_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.08,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seller_products (
  id UUID PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  seller_sku TEXT,
  price_cents INT NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  delivery_days_min INT NOT NULL DEFAULT 1,
  delivery_days_max INT NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(seller_id, product_id)
);

CREATE TABLE IF NOT EXISTS shipping_rules (
  id UUID PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id),
  country_code CHAR(2) NOT NULL DEFAULT 'NL',
  base_shipping_cents INT NOT NULL,
  free_shipping_threshold_cents INT,
  carrier TEXT NOT NULL DEFAULT 'PostNL'
);

CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY,
  cart_id UUID NOT NULL REFERENCES carts(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL DEFAULT 1,
  UNIQUE(cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS cart_optimizations (
  id UUID PRIMARY KEY,
  cart_id UUID NOT NULL REFERENCES carts(id),
  total_cents INT NOT NULL,
  products_cents INT NOT NULL,
  shipping_cents INT NOT NULL,
  selected_sellers_count INT NOT NULL,
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  cart_id UUID REFERENCES carts(id),
  payment_provider TEXT NOT NULL,
  payment_intent_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'mock_authorized',
  order_status TEXT NOT NULL DEFAULT 'created',
  total_cents INT NOT NULL,
  platform_fee_cents INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suborders (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  subtotal_cents INT NOT NULL,
  shipping_cents INT NOT NULL,
  platform_fee_cents INT NOT NULL,
  seller_payout_cents INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suborder_items (
  id UUID PRIMARY KEY,
  suborder_id UUID NOT NULL REFERENCES suborders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price_cents INT NOT NULL
);

CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY,
  suborder_id UUID NOT NULL REFERENCES suborders(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  provider_transfer_id TEXT,
  amount_cents INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  suborder_id UUID REFERENCES suborders(id),
  seller_id UUID REFERENCES sellers(id),
  carrier TEXT NOT NULL,
  tracking_code TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  eta DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
