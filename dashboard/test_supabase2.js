import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ueyizghzblngswgukfmr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWl6Z2h6YmxuZ3N3Z3VrZm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTAzOTcsImV4cCI6MjA5MDQ4NjM5N30.cQCkTKWbrGwO3gVYQZNmKAytls1TE3d7LddrgSc8QqA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
    const { data: dataTel, error: errTel } = await supabase.from('telemetry').select('id, device_id').limit(2);
    console.log("TELEMETRY DATA:", dataTel, errTel);
}
test();
