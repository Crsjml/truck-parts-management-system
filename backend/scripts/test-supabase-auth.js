import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
global.WebSocket = WebSocket;
const supabase = createClient('https://placeholder.supabase.co', 'placeholder-key', { auth: { persistSession: false } });

async function test() {
  try {
    const res = await supabase.auth.getUser(undefined);
    console.log("undefined:", res);
  } catch(e) { console.log("undefined err:", e.name, e.message); }
}
test();
