import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ueyizghzblngswgukfmr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWl6Z2h6YmxuZ3N3Z3VrZm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTAzOTcsImV4cCI6MjA5MDQ4NjM5N30.cQCkTKWbrGwO3gVYQZNmKAytls1TE3d7LddrgSc8QqA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const DOUG_USER_ID = 'jE9EVe0SqKQRiM48kwWYHZpaIcf2';

async function updateAndVerify() {
    console.log("Atualizando tenant_ids do Doug para [] (gestor)...");
    const { error: updateError } = await supabase.from('users').update({ tenant_ids: [] }).eq('id', DOUG_USER_ID);
    
    if (updateError) {
        console.error("Erro ao atualizar:", updateError);
        return;
    }
    
    console.log("Sucesso! Buscando vínculos na view users_devices...");
    const { data, error: selectError } = await supabase.from('users_devices').select('*').eq('user_id', DOUG_USER_ID);
    
    if (selectError) {
        console.error("Erro ao buscar vínculos:", selectError);
        return;
    }
    
    console.log(`Doug Silva agora está vinculado a ${data.length} dispositivos:`);
    console.log(data);
}

updateAndVerify();
