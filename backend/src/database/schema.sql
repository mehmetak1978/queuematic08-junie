-- Queuematic System Database Schema
-- PostgreSQL Database Schema for Queue Management System
-- Updated to match backend API routes

-- Drop existing tables if they exist (for reset functionality)
DROP TABLE IF EXISTS queue CASCADE;
DROP TABLE IF EXISTS counter_sessions CASCADE;
DROP TABLE IF EXISTS counters CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

-- Create branches table
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
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
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'clerk')),
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Create counters table
CREATE TABLE counters (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, number)
);

-- Create counter_sessions table (tracks which clerk is working at which counter)
CREATE TABLE counter_sessions (
    id SERIAL PRIMARY KEY,
    counter_id INTEGER NOT NULL REFERENCES counters(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL
);

-- Create queue table (main queue management)
CREATE TABLE queue (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'serving', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    counter_id INTEGER REFERENCES counters(id) ON DELETE SET NULL,
    counter_session_id INTEGER REFERENCES counter_sessions(id) ON DELETE SET NULL,
    service_duration INTEGER NULL -- in seconds
);

-- Create indexes for better performance
CREATE INDEX idx_queue_branch_status ON queue(branch_id, status);
CREATE INDEX idx_queue_created_at ON queue(created_at);
CREATE INDEX idx_queue_branch_date ON queue(branch_id, DATE(created_at));
CREATE INDEX idx_counter_sessions_active ON counter_sessions(counter_id, end_time);
CREATE INDEX idx_counter_sessions_user ON counter_sessions(user_id, end_time);
CREATE INDEX idx_users_branch_role ON users(branch_id, role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_branches_active ON branches(is_active);
CREATE INDEX idx_counters_branch_active ON counters(branch_id, is_active);

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
-- Note: Password hash is for 'password123' - should be changed in production
INSERT INTO branches (name, address, phone) VALUES
('Ana Şube', 'Merkez Mahallesi, Ana Cadde No:1, İstanbul', '+90 212 555 0001'),
('Kadıköy Şubesi', 'Kadıköy Mahallesi, Bağdat Caddesi No:123, İstanbul', '+90 216 555 0002');

-- Insert users with bcrypt hashed passwords (password: 'password123')
INSERT INTO users (username, password_hash, role, branch_id) VALUES
('admin', '$2a$12$ajCoMLqznzSh1SQFfXlJMO0sO3tfO9AYWmyKlW6GPcjWGt2AiDGwu', 'admin', NULL),
('clerk1', '$2a$12$ajCoMLqznzSh1SQFfXlJMO0sO3tfO9AYWmyKlW6GPcjWGt2AiDGwu', 'clerk', 1),
('clerk2', '$2a$12$ajCoMLqznzSh1SQFfXlJMO0sO3tfO9AYWmyKlW6GPcjWGt2AiDGwu', 'clerk', 1),
('clerk3', '$2a$12$ajCoMLqznzSh1SQFfXlJMO0sO3tfO9AYWmyKlW6GPcjWGt2AiDGwu', 'clerk', 2),
('clerk4', '$2a$12$ajCoMLqznzSh1SQFfXlJMO0sO3tfO9AYWmyKlW6GPcjWGt2AiDGwu', 'clerk', 2);

-- Insert counters for each branch
INSERT INTO counters (branch_id, number) VALUES
(1, 1), (1, 2), (1, 3),
(2, 1), (2, 2);



-- Create view for active queue status
CREATE VIEW active_queue_status AS
SELECT 
    q.id,
    q.branch_id,
    b.name as branch_name,
    q.number as queue_number,
    q.status,
    q.created_at,
    q.called_at,
    q.completed_at,
    q.service_duration,
    c.number as counter_number,
    u.username as clerk_username,
    cs.start_time as session_start_time
FROM queue q
LEFT JOIN branches b ON q.branch_id = b.id
LEFT JOIN counters c ON q.counter_id = c.id
LEFT JOIN counter_sessions cs ON q.counter_session_id = cs.id
LEFT JOIN users u ON cs.user_id = u.id
WHERE q.status IN ('waiting', 'called', 'serving')
ORDER BY q.created_at;

-- Create view for daily statistics
CREATE VIEW daily_queue_stats AS
SELECT 
    DATE(q.created_at) as date,
    q.branch_id,
    b.name as branch_name,
    COUNT(*) as total_numbers,
    COUNT(CASE WHEN q.status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN q.status = 'waiting' THEN 1 END) as waiting_count,
    COUNT(CASE WHEN q.status = 'called' THEN 1 END) as called_count,
    COUNT(CASE WHEN q.status = 'serving' THEN 1 END) as serving_count,
    AVG(CASE WHEN q.service_duration IS NOT NULL THEN q.service_duration END) as avg_service_time,
    MAX(q.number) as max_queue_number
FROM queue q
JOIN branches b ON q.branch_id = b.id
GROUP BY DATE(q.created_at), q.branch_id, b.name
ORDER BY date DESC, branch_name;

-- Create function to reset daily queue numbers
CREATE OR REPLACE FUNCTION reset_daily_queue()
RETURNS void AS $$
BEGIN
    -- This function can be called daily to clean up old completed queue items
    -- Keep only last 7 days of completed items for history
    DELETE FROM queue 
    WHERE status = 'completed' 
    AND completed_at < CURRENT_DATE - INTERVAL '7 days';
    
    -- Cancel any waiting items older than 1 day
    UPDATE queue 
    SET status = 'cancelled' 
    WHERE status = 'waiting' 
    AND created_at < CURRENT_DATE - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO queuematic_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO queuematic_user;