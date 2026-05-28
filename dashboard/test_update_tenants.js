import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ueyizghzblngswgukfmr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWl6Z2h6YmxuZ3N3Z3VrZm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTAzOTcsImV4cCI6MjA5MDQ4NjM5N30.cQCkTKWbrGwO3gVYQZNmKAytls1TE3d7LddrgSc8QqA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DOUG_USER_ID = 'jE9EVe0SqKQRiM48kwWYHZpaIcf2';

async function runTest() {
    console.log("=== ANTES (Doug com [84bed51b-48a0-4b0d-8495-158712fe1b42]) ===");
    const { data: before } = await supabase.from('users_devices').select('*').eq('user_id', DOUG_USER_ID);
    console.log("Vínculos do Doug:", before.length);

    console.log("\nAlterando tenant_ids do Doug para [] (vazio)...");
    await supabase.from('users').update({ tenant_ids: [] }).eq('id', DOUG_USER_ID);

    console.log("\n=== DEPOIS DE ALTERAR PARA [] ===");
    const { data: afterEmpty } = await supabase.from('users_devices').select('*').eq('user_id', DOUG_USER_ID);
    console.log("Vínculos do Doug (com tenant_ids=[]):", afterEmpty.length, afterEmpty);

    console.log("\nRestaurando tenant_ids do Doug para [84bed51b-48a0-4b0d-8495-158712fe1b42]...");
    await supabase.from('users').update({ tenant_ids: ['84bed51b-48a0-4b0d-8495-158712fe1b42'] }).eq('id', DOUG_USER_ID);
}

runTest();
