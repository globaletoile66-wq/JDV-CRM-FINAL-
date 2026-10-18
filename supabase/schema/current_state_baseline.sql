-- JDV CRM — CURRENT STATE BASELINE
-- Source: Supabase project arxhppptxeeyeexkdyjv (CRM JDV)
-- Captured: 2026-09-29
--
-- IMPORTANT:
-- This is a CURRENT-STATE BASELINE, not a reconstruction of the historical
-- migration sequence. The database contains historical migrations whose SQL
-- source is not present in the GitHub repository.
-- No application data is included.
--
-- This file is intentionally non-destructive. It uses CREATE TABLE IF NOT EXISTS
-- and enables RLS after table creation. Foreign keys, indexes, policies,
-- functions and triggers remain represented by the live Supabase migration
-- history and must be generated with the Supabase CLI/db pull when a complete
-- deployable migration chain is required.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid not null default gen_random_uuid(), name text not null, legal_name text,
  registration_number text, tax_number text, email text, phone text, whatsapp text,
  country text not null default 'Bénin', currency text not null default 'XOF',
  timezone text not null default 'Africa/Porto-Novo', language text not null default 'fr',
  address text, city text, logo_url text, status text not null default 'pending',
  subscription_status text not null default 'inactive', owner_user_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  website text, primary_color text default '#0B1B3D', secondary_color text default '#D4AF37', tax_id text,
  constraint organizations_pkey primary key (id)
);

create table if not exists public.profiles (
  id uuid not null, first_name text, last_name text, display_name text, phone text,
  avatar_url text, preferred_language text not null default 'fr', country text,
  status text not null default 'active', created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint profiles_pkey primary key (id)
);

create table if not exists public.organization_members (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  user_id uuid not null, role text not null, status text not null default 'active',
  joined_at timestamptz not null default now(), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint organization_members_pkey primary key (id)
);

create table if not exists public.client_portfolios (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  owner_user_id uuid not null, owner_type text not null,
  name text not null default 'Mon portefeuille clients', status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint client_portfolios_pkey primary key (id)
);

create table if not exists public.articles (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  code text not null, name text not null, description text, category text,
  unit text not null default 'unité', fixed_price numeric(14,2) not null default 0,
  cash_price numeric(14,2) not null default 0, credit_price numeric(14,2) not null default 0,
  minimum_deposit numeric(14,2) not null default 0, default_payment_amount numeric(14,2) not null default 0,
  active boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint articles_pkey primary key (id)
);

create table if not exists public.article_categories (
  id uuid not null default gen_random_uuid(), organization_id uuid, name text not null,
  code text, description text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint article_categories_pkey primary key (id)
);

create table if not exists public.prospecteurs (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, user_id uuid,
  code text not null, first_name text not null, last_name text, phone text, whatsapp text,
  email text, address text, city text, country text, photo_url text,
  status text not null default 'active', commission_rate numeric(8,2) default 0,
  hired_at date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint prospecteurs_pkey primary key (id)
);

create table if not exists public.prospects (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  prospecteur_id uuid, client_id uuid, first_name text not null, last_name text,
  phone text, whatsapp text, address text, city text, desired_article text,
  desired_article_id uuid, temperature text default 'cold', visit_count integer not null default 0,
  last_contact_at timestamptz, next_follow_up_at timestamptz, status text not null default 'new',
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  duplicate_phone_flag boolean default false, duplicate_phone_of uuid, last_follow_up_at timestamptz,
  archived_at timestamptz, category text, purchase_date_planned date, estimated_amount numeric(12,2),
  portfolio_id uuid, constraint prospects_pkey primary key (id)
);

create table if not exists public.clients (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, prospecteur_id uuid,
  code text not null, first_name text not null, last_name text, phone text, whatsapp text, email text,
  address text, city text, country text, latitude numeric(10,7), longitude numeric(10,7),
  identity_reference text, status text not null default 'active', temperature text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  last_activity_at timestamptz, archived_at timestamptz, last_payment_at timestamptz,
  last_contact_at timestamptz, portfolio_id uuid, constraint clients_pkey primary key (id)
);

create table if not exists public.sales (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, client_id uuid,
  prospecteur_id uuid, article_id uuid, sale_number text not null,
  sale_date timestamptz not null default now(), quantity integer not null default 1,
  fixed_price numeric(14,2) not null default 0, cash_price numeric(14,2) not null default 0,
  credit_price numeric(14,2) not null default 0, amount_paid numeric(14,2) not null default 0,
  amount_remaining numeric(14,2) not null default 0, payment_frequency text,
  payment_amount numeric(14,2) not null default 0, deadline_date date,
  sale_type text not null default 'credit', status text not null default 'active',
  client_location text, client_phone text, notes text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), completed_at timestamptz,
  constraint sales_pkey primary key (id)
);

create table if not exists public.payments (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, sale_id uuid,
  schedule_id uuid, client_id uuid, prospecteur_id uuid, amount numeric(14,2) not null,
  currency text not null default 'XOF', payment_date timestamptz not null default now(),
  payment_method text, provider text, provider_reference text, status text not null default 'successful',
  notes text, recorded_by uuid, created_at timestamptz not null default now(),
  provider_transaction_id text, merchant_reference text, constraint payments_pkey primary key (id)
);

create table if not exists public.commissions (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  prospecteur_id uuid not null, sale_id uuid, payment_id uuid, article_id uuid,
  commission_rate numeric(8,2) not null default 0, base_amount numeric(14,2) not null default 0,
  commission_amount numeric(14,2) not null default 0, status text not null default 'pending',
  paid_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint commissions_pkey primary key (id)
);

create table if not exists public.daily_tokens (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, client_id uuid,
  sale_id uuid, prospecteur_id uuid, token_date date not null default current_date,
  expected_amount numeric(14,2) not null default 0, paid_amount numeric(14,2) not null default 0,
  status text not null default 'pending', paid_at timestamptz, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint daily_tokens_pkey primary key (id)
);

create table if not exists public.payment_schedules (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, sale_id uuid not null,
  installment_number integer not null, due_date date not null, expected_amount numeric(14,2) not null,
  paid_amount numeric(14,2) not null default 0, status text not null default 'pending',
  paid_at timestamptz, reminder_sent boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint payment_schedules_pkey primary key (id)
);

create table if not exists public.stocks (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, article_id uuid not null,
  quantity integer not null default 0, reserved_quantity integer not null default 0,
  minimum_quantity integer not null default 0, updated_at timestamptz not null default now(),
  constraint stocks_pkey primary key (id)
);

create table if not exists public.prospecteur_stocks (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, prospecteur_id uuid not null,
  article_id uuid not null, quantity integer not null default 0, updated_at timestamptz not null default now(),
  constraint prospecteur_stocks_pkey primary key (id)
);

create table if not exists public.warehouses (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, code text not null,
  name text not null, address text, city text, country text, manager_user_id uuid,
  active boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint warehouses_pkey primary key (id)
);

create table if not exists public.warehouse_inventory (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, warehouse_id uuid not null,
  article_id uuid not null, quantity numeric(14,3) not null default 0,
  reserved_quantity numeric(14,3) not null default 0, minimum_quantity numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(), constraint warehouse_inventory_pkey primary key (id)
);

create table if not exists public.warehouse_users (
  id uuid not null default gen_random_uuid(), warehouse_id uuid not null, user_id uuid not null,
  role text not null default 'staff', active boolean not null default true,
  created_at timestamptz not null default now(), constraint warehouse_users_pkey primary key (id)
);

create table if not exists public.stock_movements (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, article_id uuid not null,
  prospecteur_id uuid, movement_type text not null, quantity integer not null,
  reference_type text, reference_id uuid, source_location text, destination_location text,
  notes text, created_by uuid, created_at timestamptz not null default now(),
  constraint stock_movements_pkey primary key (id)
);

create table if not exists public.stock_transfers (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  transfer_number text not null, source_warehouse_id uuid not null,
  destination_warehouse_id uuid not null, transfer_date timestamptz not null default now(),
  status text not null default 'draft', created_by uuid, received_by uuid, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint stock_transfers_pkey primary key (id)
);

create table if not exists public.stock_transfer_items (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  transfer_id uuid not null, article_id uuid not null, quantity numeric(14,3) not null,
  received_quantity numeric(14,3) not null default 0, created_at timestamptz not null default now(),
  constraint stock_transfer_items_pkey primary key (id)
);

create table if not exists public.suppliers (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, code text not null,
  company_name text not null, contact_name text, phone text, whatsapp text, email text,
  address text, city text, country text, tax_number text, registration_number text,
  payment_terms text, notes text, status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint suppliers_pkey primary key (id)
);

create table if not exists public.purchase_orders (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, supplier_id uuid not null,
  order_number text not null, order_date date not null default current_date, expected_date date,
  subtotal numeric(14,2) not null default 0, discount_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0, total_amount numeric(14,2) not null default 0,
  status text not null default 'draft', notes text, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint purchase_orders_pkey primary key (id)
);

create table if not exists public.purchase_order_items (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  purchase_order_id uuid not null, article_id uuid not null, quantity numeric(14,3) not null,
  unit_cost numeric(14,2) not null default 0, discount_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0, total_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(), constraint purchase_order_items_pkey primary key (id)
);

create table if not exists public.goods_receipts (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, purchase_order_id uuid,
  receipt_number text not null, receipt_date date not null default current_date, received_by uuid,
  status text not null default 'received', notes text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint goods_receipts_pkey primary key (id)
);

create table if not exists public.goods_receipt_items (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, receipt_id uuid not null,
  article_id uuid not null, quantity_received numeric(14,3) not null, unit_cost numeric(14,2),
  created_at timestamptz not null default now(), constraint goods_receipt_items_pkey primary key (id)
);

create table if not exists public.sales_return_items (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, return_id uuid not null,
  article_id uuid not null, quantity numeric(14,3) not null, refund_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(), serial_number_id uuid,
  constraint sales_return_items_pkey primary key (id)
);

create table if not exists public.sales_returns (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, sale_id uuid not null,
  client_id uuid, return_number text not null, return_date timestamptz not null default now(),
  reason text, refund_amount numeric(14,2) not null default 0, status text not null default 'pending',
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint sales_returns_pkey primary key (id)
);

create table if not exists public.serial_numbers (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, article_id uuid not null,
  serial_number text not null, status text not null default 'in_stock',
  purchase_order_id uuid, sale_id uuid, client_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint serial_numbers_pkey primary key (id)
);

create table if not exists public.article_serial_assignments (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  serial_number_id uuid not null, article_id uuid not null, prospecteur_id uuid,
  warehouse_id uuid, assigned_at timestamptz not null default now(), released_at timestamptz,
  active boolean not null default true, created_by uuid,
  constraint article_serial_assignments_pkey primary key (id)
);

create table if not exists public.call_center_tasks (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, prospect_id uuid,
  client_id uuid, prospecteur_id uuid, assigned_to uuid, task_type text not null default 'follow_up',
  priority text not null default 'normal', due_at timestamptz, status text not null default 'pending',
  notes text, completed_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint call_center_tasks_pkey primary key (id)
);

create table if not exists public.call_logs (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, prospect_id uuid,
  client_id uuid, prospecteur_id uuid, caller_user_id uuid, call_date timestamptz not null default now(),
  duration_seconds integer, result text, notes text, created_at timestamptz not null default now(),
  constraint call_logs_pkey primary key (id)
);

create table if not exists public.field_visits (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, prospecteur_id uuid not null,
  client_id uuid, prospect_id uuid, visit_date timestamptz not null default now(),
  latitude numeric(10,7), longitude numeric(10,7), address text, result text, notes text,
  next_follow_up_at timestamptz, created_at timestamptz not null default now(),
  constraint field_visits_pkey primary key (id)
);

create table if not exists public.prospect_activities (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, prospect_id uuid not null,
  prospecteur_id uuid, activity_type text not null, activity_date timestamptz not null default now(),
  result text, notes text, next_follow_up_at timestamptz, created_by uuid,
  created_at timestamptz not null default now(), constraint prospect_activities_pkey primary key (id)
);

create table if not exists public.prospect_assignments (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, prospect_id uuid not null,
  prospecteur_id uuid not null, assigned_by uuid, assigned_at timestamptz not null default now(),
  released_at timestamptz, active boolean not null default true,
  constraint prospect_assignments_pkey primary key (id)
);

create table if not exists public.prospect_followups (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, prospect_id uuid not null,
  prospecteur_id uuid, scheduled_at timestamptz not null, completed_at timestamptz,
  type text not null default 'call', status text not null default 'pending',
  reminder_sent boolean not null default false, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint prospect_followups_pkey primary key (id)
);

create table if not exists public.prospect_status_history (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, prospect_id uuid not null,
  old_status text, new_status text, changed_by uuid, reason text,
  created_at timestamptz not null default now(), constraint prospect_status_history_pkey primary key (id)
);

create table if not exists public.follow_up_reminders (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, prospect_id uuid,
  client_id uuid, user_id uuid, reminder_at timestamptz not null,
  channel text not null default 'app', status text not null default 'pending',
  message text, created_at timestamptz not null default now(),
  constraint follow_up_reminders_pkey primary key (id)
);

create table if not exists public.notifications (
  id uuid not null default gen_random_uuid(), organization_id uuid, user_id uuid,
  title text not null, message text not null, type text not null default 'info',
  read_at timestamptz, metadata jsonb not null default '{}', created_at timestamptz not null default now(),
  constraint notifications_pkey primary key (id)
);

create table if not exists public.notification_events (
  id uuid not null default gen_random_uuid(), organization_id uuid, user_id uuid,
  notification_type text not null, title text not null, message text,
  data jsonb not null default '{}', channel text not null default 'in_app',
  status text not null default 'pending', sent_at timestamptz, read_at timestamptz,
  created_at timestamptz not null default now(), constraint notification_events_pkey primary key (id)
);

create table if not exists public.notification_preferences (
  id uuid not null default gen_random_uuid(), user_id uuid not null,
  notification_type text not null, in_app boolean not null default true, email boolean not null default false,
  sms boolean not null default false, whatsapp boolean not null default false, push boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint notification_preferences_pkey primary key (id)
);

create table if not exists public.company_settings (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  setting_key text not null, setting_value jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint company_settings_pkey primary key (id)
);

create table if not exists public.organization_settings (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  settings jsonb not null default '{}', created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint organization_settings_pkey primary key (id)
);

create table if not exists public.organization_personalization (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  logo_url text, favicon_url text, primary_color text, secondary_color text, accent_color text,
  login_background_url text, dashboard_background_url text, company_slogan text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint organization_personalization_pkey primary key (id)
);

create table if not exists public.subscription_plans (
  id uuid not null default gen_random_uuid(), code text not null, name text not null, description text,
  price numeric(14,2) not null default 0, currency text not null default 'USD',
  duration_days integer not null, max_admins integer, max_prospecteurs integer, max_clients integer,
  features jsonb not null default '{}', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  billing_amount_xof numeric(12,2), constraint subscription_plans_pkey primary key (id)
);

create table if not exists public.organization_subscriptions (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, plan_id uuid not null,
  status text not null default 'pending', started_at timestamptz, expires_at timestamptz,
  auto_renew boolean not null default false, external_reference text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint organization_subscriptions_pkey primary key (id)
);

create table if not exists public.subscription_payments (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, subscription_id uuid,
  amount numeric(14,2) not null, currency text not null default 'USD', provider text,
  provider_reference text, payment_method text, status text not null default 'pending',
  paid_at timestamptz, metadata jsonb not null default '{}',
  created_at timestamptz not null default now(), constraint subscription_payments_pkey primary key (id)
);

create table if not exists public.subscription_limits (
  id uuid not null default gen_random_uuid(), plan_id uuid not null, resource_code text not null,
  limit_value bigint, unlimited boolean not null default false, created_at timestamptz not null default now(),
  constraint subscription_limits_pkey primary key (id)
);

create table if not exists public.payment_provider_accounts (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, provider text not null,
  environment text not null default 'sandbox', public_key text, secret_key_encrypted text,
  webhook_secret_encrypted text, status text not null default 'not_configured',
  last_verified_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint payment_provider_accounts_pkey primary key (id)
);

create table if not exists public.payment_provider_events (
  id uuid not null default gen_random_uuid(), organization_id uuid, provider text not null,
  event_type text not null, provider_event_id text, provider_reference text,
  status text not null default 'received', payload jsonb not null default '{}',
  error_message text, processed_at timestamptz, created_at timestamptz not null default now(),
  constraint payment_provider_events_pkey primary key (id)
);

create table if not exists public.payment_webhook_events (
  id uuid not null default gen_random_uuid(), provider text not null, organization_id uuid,
  external_event_id text, event_type text, payload jsonb not null default '{}',
  status text not null default 'received', processed_at timestamptz, error_message text,
  created_at timestamptz not null default now(), constraint payment_webhook_events_pkey primary key (id)
);

create table if not exists public.payment_refunds (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, payment_id uuid not null,
  sale_return_id uuid, amount numeric(14,2) not null, refund_date timestamptz not null default now(),
  method text, provider text, provider_reference text, status text not null default 'processed',
  created_by uuid, notes text, created_at timestamptz not null default now(),
  constraint payment_refunds_pkey primary key (id)
);

create table if not exists public.permissions (
  id uuid not null default gen_random_uuid(), code text not null, name text not null,
  description text, module text, created_at timestamptz not null default now(),
  constraint permissions_pkey primary key (id)
);

create table if not exists public.role_permissions (
  id uuid not null default gen_random_uuid(), role text not null, permission_id uuid not null,
  created_at timestamptz not null default now(), constraint role_permissions_pkey primary key (id)
);

create table if not exists public.user_permissions (
  id uuid not null default gen_random_uuid(), user_id uuid not null, permission_id uuid not null,
  granted boolean not null default true, granted_by uuid, created_at timestamptz not null default now(),
  constraint user_permissions_pkey primary key (id)
);

create table if not exists public.user_settings (
  id uuid not null default gen_random_uuid(), user_id uuid not null, setting_key text not null,
  setting_value jsonb not null default '{}', created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint user_settings_pkey primary key (id)
);

create table if not exists public.super_admins (
  id uuid not null default gen_random_uuid(), user_id uuid not null, status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  actif boolean default true, constraint super_admins_pkey primary key (id)
);

create table if not exists public.super_admin_modules (
  id uuid not null default gen_random_uuid(), user_id uuid not null, module_code text not null,
  module_name text not null, enabled boolean not null default true,
  subscription_required boolean not null default false, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint super_admin_modules_pkey primary key (id)
);

create table if not exists public.document_sequences (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  document_type text not null, prefix text, current_number bigint not null default 0,
  padding integer not null default 6, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint document_sequences_pkey primary key (id)
);

create table if not exists public.document_templates (
  id uuid not null default gen_random_uuid(), organization_id uuid, code text not null,
  name text not null, document_type text not null, template_content text,
  active boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), constraint document_templates_pkey primary key (id)
);

create table if not exists public.documents (
  id uuid not null default gen_random_uuid(), organization_id uuid not null,
  document_type text not null, document_number text, title text, storage_path text,
  related_table text, related_id uuid, status text not null default 'active',
  metadata jsonb not null default '{}', created_by uuid, created_at timestamptz not null default now(),
  constraint documents_pkey primary key (id)
);

create table if not exists public.countries (
  id uuid not null default gen_random_uuid(), code text not null, name text not null,
  currency_code text, phone_prefix text, active boolean not null default true,
  constraint countries_pkey primary key (id)
);

create table if not exists public.currencies (
  id uuid not null default gen_random_uuid(), code text not null, name text not null,
  symbol text, decimals integer not null default 2, active boolean not null default true,
  constraint currencies_pkey primary key (id)
);

create table if not exists public.languages (
  id uuid not null default gen_random_uuid(), code text not null, name text not null,
  native_name text, active boolean not null default true,
  constraint languages_pkey primary key (id)
);

create table if not exists public.exchange_rates (
  id uuid not null default gen_random_uuid(), base_currency text not null, quote_currency text not null,
  rate numeric(20,8) not null, effective_at timestamptz not null default now(),
  source text, created_at timestamptz not null default now(), constraint exchange_rates_pkey primary key (id)
);

create table if not exists public.login_security_events (
  id uuid not null default gen_random_uuid(), user_id uuid, event_type text not null,
  success boolean not null default false, ip_address inet, user_agent text,
  metadata jsonb not null default '{}', created_at timestamptz not null default now(),
  constraint login_security_events_pkey primary key (id)
);

create table if not exists public.audit_events (
  id uuid not null default gen_random_uuid(), organization_id uuid, user_id uuid,
  action text not null, entity_type text, entity_id uuid, old_data jsonb, new_data jsonb,
  ip_address inet, user_agent text, created_at timestamptz not null default now(),
  constraint audit_events_pkey primary key (id)
);

create table if not exists public.audit_logs (
  id uuid not null default gen_random_uuid(), organization_id uuid, user_id uuid,
  action text not null, entity_type text, entity_id uuid, old_data jsonb, new_data jsonb,
  ip_address inet, user_agent text, created_at timestamptz not null default now(),
  constraint audit_logs_pkey primary key (id)
);

create table if not exists public.demo_branches (
  id uuid not null default gen_random_uuid(), nom text not null, description text,
  created_at timestamptz default now(), constraint demo_branches_pkey primary key (id)
);
create table if not exists public.demo_roles (
  id uuid not null default gen_random_uuid(), branch_id uuid, code_role text not null,
  niveau_autorite integer not null, created_at timestamptz default now(),
  constraint demo_roles_pkey primary key (id)
);
create table if not exists public.demo_actions_permises (
  id uuid not null default gen_random_uuid(), role_id uuid, action_nom text not null,
  description_action text, constraint demo_actions_permises_pkey primary key (id)
);
create table if not exists public.demo_actions_log (
  id uuid not null default gen_random_uuid(), utilisateur_simulation text not null,
  role_code text not null, action_executee text not null, statut_action text not null,
  horodatage timestamptz default now(), constraint demo_actions_log_pkey primary key (id)
);

-- Remaining operational tables from the live schema.
create table if not exists public.supplier_payments (
  id uuid not null default gen_random_uuid(), organization_id uuid not null, supplier_id uuid not null,
  purchase_order_id uuid, amount numeric(14,2) not null, currency text not null default 'XOF',
  payment_date timestamptz not null default now(), payment_method text, provider text,
  provider_reference text, status text not null default 'paid', recorded_by uuid, notes text,
  created_at timestamptz not null default now(), constraint supplier_payments_pkey primary key (id)
);

-- RLS is enabled on every exposed public table in the live CRM.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- Verification helper: returns the live table count.
select count(*) as public_table_count
from information_schema.tables
where table_schema='public' and table_type='BASE TABLE';
