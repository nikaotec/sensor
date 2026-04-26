import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ueyizghzblngswgukfmr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWl6Z2h6YmxuZ3N3Z3VrZm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTAzOTcsImV4cCI6MjA5MDQ4NjM5N30.cQCkTKWbrGwO3gVYQZNmKAytls1TE3d7LddrgSc8QqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: devices } = await supabase.from('devices_status').select('id, name');
    console.log("Devices:", devices?.map(d => d.id));
    
    if (devices && devices.length > 0) {
        const id = devices[0].id;
        const { data, error } = await supabase.from('telemetry')
            .select('data_registro, hora_registro')
            .eq('device_id', id)
            .gte('data_registro', '2026-04-01')
            .lte('data_registro', '2026-04-30')
            .order('data_registro', { ascending: true })
            .order('hora_registro', { ascending: true })
            .limit(10);
            
        console.log(`First 10 records for ${id}:`, data);
        
        const { data: c } = await supabase.from('telemetry').select('id', { count: 'exact' }).eq('device_id', id);
        console.log("Total records for", id, "=", c?.length);
    }
}
test();
