-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'outcome')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category VARCHAR(100),
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on date for better query performance
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Insert some sample data
INSERT INTO transactions (type, amount, description, category, date) VALUES
    ('income', 3000.00, 'Salaire mensuel', 'Salaire', '2025-01-01'),
    ('outcome', 800.00, 'Loyer', 'Logement', '2025-01-05'),
    ('outcome', 150.00, 'Courses', 'Alimentation', '2025-01-10'),
    ('income', 500.00, 'Freelance', 'Travail', '2025-01-15'),
    ('outcome', 50.00, 'Restaurant', 'Loisirs', '2025-01-18'),
    ('outcome', 120.00, 'Électricité', 'Factures', '2025-01-20');
