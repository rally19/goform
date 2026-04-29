-- Add the "signature" field type to the field_type enum.
-- Respondents draw, type, or upload a signature. The answer is stored as a
-- JSON object: { kind: "draw" | "type" | "upload", dataUrl: string, text?: string, font?: string }
-- where dataUrl is always a base64 PNG data URL suitable for <img src="...">.
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'signature';
