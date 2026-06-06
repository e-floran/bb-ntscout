-- One-time script to update player_weeks rows from Feb 20 to Feb 17
-- This subtracts 3 days from the updated_at timestamp
-- Time component and year remain unchanged

-- First, view the rows that will be updated (optional, for verification)
-- SELECT updated_at, updated_at - INTERVAL '3 days' as new_updated_at
-- FROM player_weeks
-- WHERE DATE(updated_at) = '2026-02-20';

-- Update the rows
UPDATE player_weeks
SET updated_at = updated_at - INTERVAL '3 days'
WHERE DATE(updated_at) = '2026-02-20';
