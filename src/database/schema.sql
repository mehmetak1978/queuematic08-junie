-- Queuematic System Database Schema
-- PostgreSQL Database Schema for Queue Management System

-- Drop existing tables if they exist (for reset functionality)
DROP TABLE IF EXISTS queue_transactions CASCADE;
DROP TABLE IF EXISTS queue_numbers CASCADE;
DROP TABLE IF EXISTS counter_sessions CASCADE;
DROP TABLE IF EXISTS counters CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

-- Create branches table
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'clerk')),
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create counters table
CREATE TABLE counters (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    counter_number INTEGER NOT NULL,
    name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, counter_number)
);

-- Create counter_sessions table (tracks which clerk is working at which counter)
CREATE TABLE counter_sessions (
    id SERIAL PRIMARY KEY,
    counter_id INTEGER NOT NULL REFERENCES counters(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true
);

-- Create queue_numbers table
CREATE TABLE queue_numbers (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    queue_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'serving', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    counter_id INTEGER REFERENCES counters(id) ON DELETE SET NULL,
    served_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create queue_transactions table (tracks all queue operations)
CREATE TABLE queue_transactions (
    id SERIAL PRIMARY KEY,
    queue_number_id INTEGER NOT NULL REFERENCES queue_numbers(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'called', 'serving', 'completed', 'cancelled')),
    counter_id INTEGER REFERENCES counters(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_queue_numbers_branch_status ON queue_numbers(branch_id, status);
CREATE INDEX idx_queue_numbers_created_at ON queue_numbers(created_at);
CREATE INDEX idx_counter_sessions_active ON counter_sessions(is_active, counter_id);
CREATE INDEX idx_queue_transactions_queue_id ON queue_transactions(queue_number_id);
CREATE INDEX idx_users_branch_role ON users(branch_id, role);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_counters_updated_at BEFORE UPDATE ON counters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO branches (name, address, phone) VALUES
('Ana Şube', 'Merkez Mahallesi, Ana Cadde No:1', '+90 212 555 0001'),
('Şube 2', 'Yeni Mahalle, İkinci Sokak No:15', '+90 212 555 0002');

INSERT INTO users (username, password_hash, full_name, role, branch_id) VALUES
('admin', '$2b$10$rQZ8kHWKtGKVQZ8kHWKtGOuKVQZ8kHWKtGKVQZ8kHWKtGKVQZ8kHW', 'Sistem Yöneticisi', 'admin', NULL),
('clerk1', '$2b$10$rQZ8kHWKtGKVQZ8kHWKtGOuKVQZ8kHWKtGKVQZ8kHWKtGKVQZ8kHW', 'Ahmet Yılmaz', 'clerk', 1),
('clerk2', '$2b$10$rQZ8kHWKtGKVQZ8kHWKtGOuKVQZ8kHWKtGKVQZ8kHWKtGKVQZ8kHW', 'Ayşe Demir', 'clerk', 1),
('clerk3', '$2b$10$rQZ8kHWKtGKVQZ8kHWKtGKVQZ8kHWKtGKVQZ8kHWKtGKVQZ8kHW', 'Mehmet Kaya', 'clerk', 2);

INSERT INTO counters (branch_id, counter_number, name) VALUES
(1, 1, 'Gişe 1'),
(1, 2, 'Gişe 2'),
(1, 3, 'Gişe 3'),
(2, 1, 'Gişe 1'),
(2, 2, 'Gişe 2');

-- Create view for active queue status
CREATE VIEW active_queue_status AS
SELECT 
    qn.id,
    qn.branch_id,
    b.name as branch_name,
    qn.queue_number,
    qn.status,
    qn.created_at,
    qn.called_at,
    qn.completed_at,
    c.counter_number,
    c.name as counter_name,
    u.full_name as served_by_name
FROM queue_numbers qn
LEFT JOIN branches b ON qn.branch_id = b.id
LEFT JOIN counters c ON qn.counter_id = c.id
LEFT JOIN users u ON qn.served_by = u.id
WHERE qn.status IN ('waiting', 'called', 'serving')
ORDER BY qn.created_at;