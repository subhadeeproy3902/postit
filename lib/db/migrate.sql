-- Migration to add new columns to chats table
-- Run this SQL in your database to update the schema

ALTER TABLE chats 
ADD COLUMN visitor_id VARCHAR NOT NULL DEFAULT 'migration_default',
ADD COLUMN title VARCHAR DEFAULT 'New Chat',
ADD COLUMN is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN created_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- Remove the default after adding the column
ALTER TABLE chats ALTER COLUMN visitor_id DROP DEFAULT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS chats_visitor_id_idx ON chats(visitor_id);
CREATE INDEX IF NOT EXISTS chats_created_at_idx ON chats(created_at);
CREATE INDEX IF NOT EXISTS chats_visitor_id_created_at_idx ON chats(visitor_id, created_at);
