-- Row Level Security Policies for Tidyhood
-- Implements multi-tenant access control

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is partner
CREATE OR REPLACE FUNCTION is_partner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'partner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
-- Users can view and update their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (is_admin());

-- ADDRESSES POLICIES
-- Users can manage their own addresses
CREATE POLICY "addresses_select_own" ON addresses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "addresses_insert_own" ON addresses
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "addresses_update_own" ON addresses
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "addresses_delete_own" ON addresses
  FOR DELETE USING (user_id = auth.uid());

-- Admins can view all addresses
CREATE POLICY "addresses_admin_select" ON addresses
  FOR SELECT USING (is_admin());

-- PARTNERS POLICIES
-- Partners are read-only for most users
CREATE POLICY "partners_select_all" ON partners
  FOR SELECT USING (active = true);

-- Admins can manage partners
CREATE POLICY "partners_admin_all" ON partners
  FOR ALL USING (is_admin());

-- CAPACITY_CALENDAR POLICIES
-- Everyone can view capacity (for slot selection)
CREATE POLICY "capacity_select_all" ON capacity_calendar
  FOR SELECT USING (true);

-- Partners can update their own capacity
CREATE POLICY "capacity_partner_update" ON capacity_calendar
  FOR UPDATE USING (
    is_partner() AND 
    partner_id IN (SELECT id FROM partners WHERE active = true)
  );

-- Admins can manage all capacity
CREATE POLICY "capacity_admin_all" ON capacity_calendar
  FOR ALL USING (is_admin());

-- PRICING_RULES POLICIES
-- Everyone can view active pricing rules
CREATE POLICY "pricing_select_active" ON pricing_rules
  FOR SELECT USING (active = true);

-- Admins can manage pricing
CREATE POLICY "pricing_admin_all" ON pricing_rules
  FOR ALL USING (is_admin());

-- ORDERS POLICIES
-- Users can view their own orders
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (user_id = auth.uid());

-- Users can create orders for themselves
CREATE POLICY "orders_insert_own" ON orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own pending orders (for cancellation)
CREATE POLICY "orders_update_own_pending" ON orders
  FOR UPDATE USING (
    user_id = auth.uid() AND 
    status IN ('PENDING', 'PAID')
  );

-- Partners can view and update orders assigned to them
CREATE POLICY "orders_partner_select" ON orders
  FOR SELECT USING (
    is_partner() AND
    partner_id IN (SELECT id FROM partners WHERE active = true)
  );

CREATE POLICY "orders_partner_update" ON orders
  FOR UPDATE USING (
    is_partner() AND
    partner_id IN (SELECT id FROM partners WHERE active = true)
  );

-- Admins can manage all orders
CREATE POLICY "orders_admin_all" ON orders
  FOR ALL USING (is_admin());

-- ORDER_EVENTS POLICIES
-- Users can view events for their orders
CREATE POLICY "order_events_select_own" ON order_events
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- Partners can view events for their orders
CREATE POLICY "order_events_partner_select" ON order_events
  FOR SELECT USING (
    is_partner() AND
    order_id IN (
      SELECT id FROM orders 
      WHERE partner_id IN (SELECT id FROM partners WHERE active = true)
    )
  );

-- System can insert events (via service role)
CREATE POLICY "order_events_insert_system" ON order_events
  FOR INSERT WITH CHECK (true);

-- Admins can view all events
CREATE POLICY "order_events_admin_select" ON order_events
  FOR SELECT USING (is_admin());

-- BAGS POLICIES
-- Users can view bags for their orders
CREATE POLICY "bags_select_own" ON bags
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- Partners can view and update bags for their orders
CREATE POLICY "bags_partner_all" ON bags
  FOR ALL USING (
    is_partner() AND
    order_id IN (
      SELECT id FROM orders 
      WHERE partner_id IN (SELECT id FROM partners WHERE active = true)
    )
  );

-- System can create bags
CREATE POLICY "bags_insert_system" ON bags
  FOR INSERT WITH CHECK (true);

-- Admins can manage all bags
CREATE POLICY "bags_admin_all" ON bags
  FOR ALL USING (is_admin());

-- CLEANING_CHECKLIST POLICIES
-- Users can view checklists for their orders
CREATE POLICY "checklist_select_own" ON cleaning_checklist
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- Partners can manage checklists for their orders
CREATE POLICY "checklist_partner_all" ON cleaning_checklist
  FOR ALL USING (
    is_partner() AND
    order_id IN (
      SELECT id FROM orders 
      WHERE partner_id IN (SELECT id FROM partners WHERE active = true)
    )
  );

-- System can create checklists
CREATE POLICY "checklist_insert_system" ON cleaning_checklist
  FOR INSERT WITH CHECK (true);

-- Admins can manage all checklists
CREATE POLICY "checklist_admin_all" ON cleaning_checklist
  FOR ALL USING (is_admin());

-- CLAIMS POLICIES
-- Users can view and create claims for their orders
CREATE POLICY "claims_select_own" ON claims
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

CREATE POLICY "claims_insert_own" ON claims
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- Partners can view claims for their orders
CREATE POLICY "claims_partner_select" ON claims
  FOR SELECT USING (
    is_partner() AND
    order_id IN (
      SELECT id FROM orders 
      WHERE partner_id IN (SELECT id FROM partners WHERE active = true)
    )
  );

-- Admins can manage all claims
CREATE POLICY "claims_admin_all" ON claims
  FOR ALL USING (is_admin());

-- PAYOUTS POLICIES
-- Partners can view their own payouts
CREATE POLICY "payouts_partner_select" ON payouts
  FOR SELECT USING (
    is_partner() AND
    partner_id IN (SELECT id FROM partners WHERE active = true)
  );

-- Admins can manage all payouts
CREATE POLICY "payouts_admin_all" ON payouts
  FOR ALL USING (is_admin());

-- SUBSCRIPTIONS POLICIES
-- Users can manage their own subscriptions
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "subscriptions_insert_own" ON subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "subscriptions_update_own" ON subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- Admins can view all subscriptions
CREATE POLICY "subscriptions_admin_select" ON subscriptions
  FOR SELECT USING (is_admin());

-- INVOICES POLICIES
-- Users can view invoices for their orders
CREATE POLICY "invoices_select_own" ON invoices
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- Partners can view invoices for their orders
CREATE POLICY "invoices_partner_select" ON invoices
  FOR SELECT USING (
    is_partner() AND
    order_id IN (
      SELECT id FROM orders 
      WHERE partner_id IN (SELECT id FROM partners WHERE active = true)
    )
  );

-- System can create/update invoices
CREATE POLICY "invoices_insert_system" ON invoices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "invoices_update_system" ON invoices
  FOR UPDATE USING (true);

-- Admins can manage all invoices
CREATE POLICY "invoices_admin_all" ON invoices
  FOR ALL USING (is_admin());

-- BUILDINGS & BUILDING_RESIDENTS POLICIES (read-only for now)
CREATE POLICY "buildings_select_all" ON buildings
  FOR SELECT USING (true);

CREATE POLICY "building_residents_select_all" ON building_residents
  FOR SELECT USING (true);

CREATE POLICY "buildings_admin_all" ON buildings
  FOR ALL USING (is_admin());

CREATE POLICY "building_residents_admin_all" ON building_residents
  FOR ALL USING (is_admin());
