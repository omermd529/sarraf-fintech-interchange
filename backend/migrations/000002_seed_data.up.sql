-- Sarraf Treasury Account (collects interchange fees)
INSERT INTO users (user_id, username, full_name, balance_sar)
VALUES ('00000000-0000-0000-0000-000000000000', 'sarraf_treasury', 'Sarraf Revenue Account', 0.00)
ON CONFLICT (user_id) DO NOTHING;

-- Default merchant
INSERT INTO merchants (business_name, category, interchange_fee_pct)
VALUES ('Blue Nile Coffee', 'Food & Beverage', 1.00)
ON CONFLICT DO NOTHING;
