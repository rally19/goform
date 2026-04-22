-- Add paragraph and divider field types to the field_type enum
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'paragraph';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'divider';
