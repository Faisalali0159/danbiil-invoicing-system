-- Danbiil Distributor Management System — Quotations Module
-- Quotation (with print format) that can be converted into a Sales Invoice
-- linked to customer and items, with payment terms.

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------

CREATE TYPE quotation_status AS ENUM (
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'converted'
);

-- ---------------------------------------------------------------------------
-- Quotations
-- ---------------------------------------------------------------------------

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  delivery_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status quotation_status NOT NULL DEFAULT 'draft',
  payment_terms TEXT,
  notes TEXT,
  converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotations_customer ON quotations(customer_id);
CREATE INDEX idx_quotations_date ON quotations(date);
CREATE INDEX idx_quotations_number ON quotations(quotation_number);
CREATE INDEX idx_quotations_status ON quotations(status);

CREATE TABLE quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  selling_price DECIMAL(12, 2) NOT NULL,
  cost_price DECIMAL(12, 2) NOT NULL,
  total DECIMAL(12, 2) NOT NULL
);

CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id);

-- ---------------------------------------------------------------------------
-- Invoices: payment terms + link back to source quotation
-- ---------------------------------------------------------------------------

ALTER TABLE invoices ADD COLUMN payment_terms TEXT;
ALTER TABLE invoices
  ADD COLUMN quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL;

CREATE INDEX idx_invoices_quotation ON invoices(quotation_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

CREATE TRIGGER quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (mirrors invoices: sales_staff+ can read/write)
-- ---------------------------------------------------------------------------

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotations_select ON quotations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY quotations_write ON quotations
  FOR ALL TO authenticated
  USING (get_user_role() IN ('owner', 'admin', 'sales_staff'))
  WITH CHECK (get_user_role() IN ('owner', 'admin', 'sales_staff'));

CREATE POLICY quotation_items_select ON quotation_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY quotation_items_write ON quotation_items
  FOR ALL TO authenticated
  USING (get_user_role() IN ('owner', 'admin', 'sales_staff'))
  WITH CHECK (get_user_role() IN ('owner', 'admin', 'sales_staff'));
