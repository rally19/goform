-- Add email_verified_at column to users table
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE;

-- If you have existing data where email_verified was TRUE, you can set it to current timestamp
-- UPDATE users SET email_verified_at = NOW() WHERE email_verified = TRUE;

-- Drop the old email_verified column
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
