-- Add scout and created_by columns to existing tables

-- Add scout column to players table (nullable foreign key to users table)
ALTER TABLE players 
ADD COLUMN scout INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add created_by column to scoutings table (integer column)
ALTER TABLE scoutings 
ADD COLUMN created_by INTEGER;

-- Create indexes for better query performance
CREATE INDEX idx_players_scout ON players(scout);
CREATE INDEX idx_scoutings_created_by ON scoutings(created_by);

-- Show results
SELECT 'Scout column added to players table' as status;
SELECT 'Created_by column added to scoutings table' as status;

-- Optionally, you can add a foreign key constraint for created_by as well
-- (uncomment the following lines if you want created_by to reference users table)
-- ALTER TABLE scoutings 
-- ADD CONSTRAINT fk_scoutings_created_by 
-- FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;