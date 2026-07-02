-- Danbiil Distributor Management System — Initial Schema
-- Run via Supabase CLI or SQL editor

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
  'owner',
  'admin',
  'sales_staff',
  'store_manager',
  'accountant'
);

CREATE TYPE payment_status AS ENUM (
  'paid',
  'partial',
  'unpaid',
  'overdue'
);

CREATE TYPE purchase_status AS ENUM (
  'paid',
  'partial',
  'unpaid'
);

CREATE TYPE commission_status AS ENUM (
  'pending',
  'paid',
  'cancelled'
);

CREATE TYPE delivery_status AS ENUM (
  'pending',
  'in_transit',
  'delivered',
  'cancelled'
);

CREATE TYPE payment_type AS ENUM (
  'customer_payment',
  'supplier_payment',
  'expense',
  'other'
);

CREATE TYPE document_type AS ENUM (
  'invoice',
  'receipt',
  'report',
  'product_image',
  'logo'
);

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'sales_staff',
  commission_rate DECIMAL(5, 2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Company & Tax Settings
-- ---------------------------------------------------------------------------

CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  tax_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_name TEXT NOT NULL DEFAULT 'VAT',
  percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------------

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  company_name TEXT,
  current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  company_name TEXT,
  credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  barcode TEXT,
  purchase_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);

-- ---------------------------------------------------------------------------
-- Purchases
-- ---------------------------------------------------------------------------

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  remaining_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status purchase_status NOT NULL DEFAULT 'unpaid',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  cost_price DECIMAL(12, 2) NOT NULL,
  total DECIMAL(12, 2) NOT NULL
);

-- ---------------------------------------------------------------------------
-- Borrowed Products
-- ---------------------------------------------------------------------------

CREATE TABLE borrowed_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  cost DECIMAL(12, 2) NOT NULL,
  borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  delivery_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  remaining_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_date ON invoices(date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  selling_price DECIMAL(12, 2) NOT NULL,
  cost_price DECIMAL(12, 2) NOT NULL,
  profit DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL
);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type payment_type NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------------

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_date ON expenses(date);

-- ---------------------------------------------------------------------------
-- Deliveries
-- ---------------------------------------------------------------------------

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  driver_name TEXT,
  vehicle TEXT,
  cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status delivery_status NOT NULL DEFAULT 'pending',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Commissions
-- ---------------------------------------------------------------------------

CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  percentage DECIMAL(5, 2) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status commission_status NOT NULL DEFAULT 'pending',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Documents (storage references)
-- ---------------------------------------------------------------------------

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  related_id UUID,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role user_role;
  meta_role TEXT;
BEGIN
  meta_role := NULLIF(trim(NEW.raw_user_meta_data->>'role'), '');

  IF meta_role IS NOT NULL AND meta_role IN (
    'owner', 'admin', 'sales_staff', 'store_manager', 'accountant'
  ) THEN
    assigned_role := meta_role::user_role;
  ELSE
    assigned_role := 'sales_staff';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(trim(NEW.email), ''),
      'User'
    ),
    COALESCE(NULLIF(trim(NEW.email), ''), 'no-email@local'),
    assigned_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowed_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Authenticated users can read their own profile
CREATE POLICY profiles_select ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_user_role() IN ('owner', 'admin'));

CREATE POLICY profiles_insert ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR get_user_role() IN ('owner', 'admin'));

-- Owner/admin: full access; others: role-based
CREATE POLICY authenticated_read ON company_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY admin_write_company ON company_settings
  FOR ALL TO authenticated
  USING (get_user_role() IN ('owner', 'admin'))
  WITH CHECK (get_user_role() IN ('owner', 'admin'));

CREATE POLICY authenticated_read_tax ON tax_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY admin_write_tax ON tax_settings
  FOR ALL TO authenticated
  USING (get_user_role() IN ('owner', 'admin', 'accountant'))
  WITH CHECK (get_user_role() IN ('owner', 'admin', 'accountant'));

-- Products: all authenticated can read; store_manager+ can write
CREATE POLICY products_select ON products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY products_write ON products
  FOR ALL TO authenticated
  USING (get_user_role() IN ('owner', 'admin', 'store_manager'))
  WITH CHECK (get_user_role() IN ('owner', 'admin', 'store_manager'));

-- Customers: sales_staff+ can read/write
CREATE POLICY customers_select ON customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY customers_write ON customers
  FOR ALL TO authenticated
  USING (get_user_role() IN ('owner', 'admin', 'sales_staff'))
  WITH CHECK (get_user_role() IN ('owner', 'admin', 'sales_staff'));

-- Invoices: sales_staff+ can read/write
CREATE POLICY invoices_select ON invoices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY invoices_write ON invoices
  FOR ALL TO authenticated
  USING (get_user_role() IN ('owner', 'admin', 'sales_staff'))
  WITH CHECK (get_user_role() IN ('owner', 'admin', 'sales_staff'));

CREATE POLICY invoice_items_select ON invoice_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY invoice_items_write ON invoice_items
  FOR ALL TO authenticated
  USING (get_user_role() IN ('owner', 'admin', 'sales_staff'))
  WITH CHECK (get_user_role() IN ('owner', 'admin', 'sales_staff'));

-- Expenses: accountant+ only
CREATE POLICY expenses_select ON expenses
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('owner', 'admin', 'accountant'));

CREATE POLICY expenses_write ON expenses
  FOR ALL TO authenticated
  USING (get_user_role() IN ('owner', 'admin', 'accountant'))
  WITH CHECK (get_user_role() IN ('owner', 'admin', 'accountant'));

-- Commissions: owner/admin/accountant
CREATE POLICY commissions_select ON commissions
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid()
    OR get_user_role() IN ('owner', 'admin', 'accountant')
  );

CREATE POLICY commissions_write ON commissions
  FOR ALL TO authenticated
  USING (get_user_role() IN ('owner', 'admin', 'accountant'))
  WITH CHECK (get_user_role() IN ('owner', 'admin', 'accountant'));

-- Generic policies for remaining tables (authenticated access)
CREATE POLICY categories_all ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY suppliers_all ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY purchases_all ON purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY purchase_items_all ON purchase_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY borrowed_products_all ON borrowed_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY payments_all ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY deliveries_all ON deliveries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY documents_all ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Storage buckets (run in Supabase dashboard or via API)
-- ---------------------------------------------------------------------------
-- company-assets, logos, invoices, receipts, reports, product-images
