import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});
const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function run() {
  const email = `test-change-${Date.now()}@example.com`;
  const { data: user, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: 'Password123!',
    email_confirm: true,
  });

  const { data: sessionData, error: signinErr } = await supabaseAnon.auth.signInWithPassword({
    email,
    password: 'Password123!',
  });

  const newEmail = `changed-${Date.now()}@example.com`;
  const { data: updateData, error: updateErr } = await supabaseAnon.auth.updateUser({
    email: newEmail
  });

  if (updateErr) {
    console.error("Failed to change email:", updateErr.message);
  } else {
    console.log("Success changing email");
  }
  
  await supabase.auth.admin.deleteUser(user.user.id);
}

run();
