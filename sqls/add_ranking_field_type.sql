-- Add the "ranking" field type to the field_type enum.
-- Respondents drag options to rank them; the answer is stored as an
-- ordered string[] of option values (index 0 = top rank / 1st).
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'ranking';
