import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ueyizghzblngswgukfmr.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWl6Z2h6YmxuZ3N3Z3VrZm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTAzOTcsImV4cCI6MjA5MDQ4NjM5N30.cQCkTKWbrGwO3gVYQZNmKAytls1TE3d7LddrgSc8QqA";

async function fetchSchema() {
    const res = await fetch(SUPABASE_URL, {
        headers: {
            'apikey': SUPABASE_ANON_KEY
        }
    });
    const schema = await res.json();
    console.log("Response:", schema);
}

fetchSchema();
