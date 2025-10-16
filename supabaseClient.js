import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from '@env'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Supabase URL or KEY missing! Check your .env file.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Database table structure you'll need to create in Supabase:
/*
Table: entries
Columns:
- id (int8, primary key, auto-increment)
- title (text)
- content (text)
- sentiment (int2)
- created_at (timestamptz, default: now())
- user_id (uuid, references auth.users)

Enable Row Level Security (RLS) with policies:
- SELECT: authenticated users can read their own entries
- INSERT: authenticated users can create entries
- UPDATE: authenticated users can update their own entries
- DELETE: authenticated users can delete their own entries
*/