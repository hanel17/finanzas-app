import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uslbqzhdfisnwafmfuoa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbGJxemhkZmlzbndhZm1mdW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMzIyODUsImV4cCI6MjEwMDgwODI4NX0.HDTeXkbYC1xenYN_yaUCCTFg9Go3_crEh984C6Hqzhs'

export const supabase = createClient(supabaseUrl, supabaseKey)
