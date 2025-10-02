-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(255) NOT NULL UNIQUE,
    main_team_id INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on login for faster lookups
CREATE INDEX idx_users_login ON users(login);

-- Create index on main_team_id for team-based queries
CREATE INDEX idx_users_main_team_id ON users(main_team_id);

-- Insert existing users data (assuming team IDs: 11, 50, 1011 exist in teams table)
INSERT INTO users (login, main_team_id, active, role) VALUES
    ('Atlantitan', 1011, true, 'Admin'),
    ('gpolin', 11, true, 'User'),
    ('Walter Sobchak', 50, true, 'Staff'),
    ('Squall_L81', 11, true, 'Admin'),
    ('Boulfe', 1011, true, 'Staff'),
    ('Smidge', 11, false, 'User'),
    ('slamdunk9', 11, true, 'User'),
    ('Charlypeartree71', 1011, true, 'Coach'),
    ('chavarinho42', 1011, false, 'Staff'),
    ('sbooby', 11, true, 'Coach'),
    ('AriesGod', 11, true, 'Staff'),
    ('Gouloute', 11, true, 'Scout');