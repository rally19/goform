-- Add joined_at column to active_form_sessions table
ALTER TABLE active_form_sessions 
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

-- Index for performance when sorting by join order
CREATE INDEX IF NOT EXISTS active_form_sessions_joined_at_idx ON active_form_sessions(joined_at);
