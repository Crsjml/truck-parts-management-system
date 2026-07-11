import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import WebSocket from 'ws';
global.WebSocket = WebSocket;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const USERS = [
  { email: 'lionel.messi@example.com', password: 'Password123!', full_name: 'Lionel Messi' },
  { email: 'cristiano.ronaldo@example.com', password: 'Password123!', full_name: 'Cristiano Ronaldo' },
  { email: 'admin@tarlactruckparts.local', password: 'admin123', full_name: 'System Admin' },
];

async function seed() {
  for (const user of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.full_name },
    });

    if (error) {
      if (error.message?.includes('already exists') || error.message?.includes('already registered')) {
        console.log(`Already exists: ${user.email}`);
      } else {
        console.error(`Failed: ${user.email} — ${error.message}`);
      }
    } else {
      console.log(`Created: ${user.email} (${data.user.id})`);
    }
  }
}

seed().then(() => {
  console.log('Done');
  process.exit(0);
}).catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
