-- Migration: Initial Schema for Adil Brothers Invoice App
-- Created at: 2026-04-02

-- 1. Create UMKM Buyers table
CREATE TABLE IF NOT EXISTS umkm_buyers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inv_number TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('eceran', 'umkm', 'pakan')),
    buyer TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    qty NUMERIC NOT NULL DEFAULT 0,
    price NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    shipping NUMERIC DEFAULT 0,
    debt NUMERIC DEFAULT 0,
    type TEXT, -- Specific for 'pakan' category
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE umkm_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Allow all for now, adjust for production)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for anon' AND tablename = 'umkm_buyers') THEN
        CREATE POLICY "Enable all for anon" ON umkm_buyers FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for anon' AND tablename = 'invoices') THEN
        CREATE POLICY "Enable all for anon" ON invoices FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
