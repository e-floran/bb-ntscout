UPDATE players
SET current_age = current_age + 1
WHERE current_age IS NOT NULL;
