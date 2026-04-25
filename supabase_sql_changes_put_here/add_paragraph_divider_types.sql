-- Add paragraph and divider field types to the field_type enum
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'paragraph';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'divider';

-- Add grid field types
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'radio_grid';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'checkbox_grid';
