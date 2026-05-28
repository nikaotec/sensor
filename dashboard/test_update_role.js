import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ueyizghzblngswgukfmr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWl6Z2h6YmxuZ3N3Z3VrZm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTAzOTcsImV4cCI6MjA5MDQ4NjM5N30.cQCkTKWbrGwO3gVYQZNmKAytls1TE3d7LddrgSc8QqA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DOUG_USER_ID = 'jE9EVe0SqKQRiM48kwWYHZpaIcf2';

async function runTest() {
    console.log("=== ANTES DA ALTERAÇÃO ===");
    const { data: before } = await supabase.from('users_devices').select('*').eq('user_id', DOUG_USER_ID);
    console.log("Vínculos do Doug:", before.length, before);

    console.log("\nAlterando a role do Doug para 'gestor'...");
    const { error: errUpdate } = await supabase
        .from('users')
        .update({ role: 'gestor' })
        .eq('id', DOUG_USER_ID);
    
    if (errUpdate) {
        console.error("Erro ao atualizar role:", errUpdate);
        return;
    }

    console.log("\n=== DEPOIS DA ALTERAÇÃO PARA 'gestor' ===");
    const { data: after } = await supabase.from('users_devices').select('*').eq('user_id', DOUG_USER_ID);
    console.log("Vínculos do Doug:", after.length, after);

    console.log("\nRestaurando a role do Doug para 'manager'...");
    await supabase
        .from('users')
        .update({ role: 'manager' })
        .eq('id', DOUG_USER_ID);
}

runTest();
