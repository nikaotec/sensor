import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ueyizghzblngswgukfmr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWl6Z2h6YmxuZ3N3Z3VrZm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTAzOTcsImV4cCI6MjA5MDQ4NjM5N30.cQCkTKWbrGwO3gVYQZNmKAytls1TE3d7LddrgSc8QqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: data8, error: error8 } = await supabase.from('telemetry').select('data_registro, hora_registro').like('hora_registro', '08%').limit(5);
    const { data: data16, error: error16 } = await supabase.from('telemetry').select('data_registro, hora_registro').like('hora_registro', '16%').limit(5);
    console.log("08:", data8);
    console.log("16:", data16);
}
test();
