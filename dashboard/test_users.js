import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = "https://ueyizghzblngswgukfmr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWl6Z2h6YmxuZ3N3Z3VrZm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTAzOTcsImV4cCI6MjA5MDQ4NjM5N30.cQCkTKWbrGwO3gVYQZNmKAytls1TE3d7LddrgSc8QqA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUsers() {
    const { data: users, error: errUsers } = await supabase.from('users').select('*');
    const { data: userDevices, error: errDevices } = await supabase.from('users_devices').select('*');
    const { data: tenants, error: errTenants } = await supabase.from('tenants').select('*');

    const output = {
        users,
        userDevices,
        tenants
    };

    fs.writeFileSync('test_users_output.json', JSON.stringify(output, null, 2));
    console.log("JSON salvo com sucesso!");
}

checkUsers();
