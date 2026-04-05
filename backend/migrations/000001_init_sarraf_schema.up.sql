-- Enable UUID extension for secure, non-sequential IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (The Wallet)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    balance_sar DECIMAL(18, 2) NOT NULL DEFAULT 0.00 CHECK (balance_sar >= 0),
    currency VARCHAR(3) DEFAULT 'SAR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Merchants Table (The Business Tier)
CREATE TABLE IF NOT EXISTS merchants (
    merchant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    category VARCHAR(50), 
    interchange_fee_pct DECIMAL(5, 2) DEFAULT 1.00, -- SAMA-style fee tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transactions Table (The Immutable Ledger)
-- NOTE: In Fintech, we NEVER 'UPDATE' a transaction. We only 'INSERT' new states.
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(user_id),
    receiver_id UUID REFERENCES users(user_id),
    merchant_id UUID REFERENCES merchants(merchant_id),
    amount DECIMAL(18, 2) NOT NULL,
    fee_amount DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL, -- 'PENDING', 'COMPLETED', 'FAILED', 'REVERSED'
    rrn VARCHAR(12) UNIQUE NOT NULL, -- Retrieval Reference Number for SAMA Audit
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create an Audit Index for fast reconciliation
CREATE INDEX idx_transactions_rrn ON transactions(rrn);
CREATE INDEX idx_users_username ON users(username);