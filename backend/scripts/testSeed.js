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

async function seedUser(email, password) {
  try {
    console.log(`Seeding test user: ${email}`);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'E2E Test User' },
    });

    if (error) {
      if (error.message?.includes('already exists') || error.message?.includes('already registered')) {
        console.log(`User already exists: ${email}`);
      } else {
        throw error;
      }
    } else {
      console.log(`Successfully seeded user: ${data.user.id}`);
    }
  } catch (err) {
    console.error(`Seed failed for ${email}:`, err);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Please provide email and password.');
  process.exit(1);
}

seedUser(args[0], args[1]).then(() => process.exit(0));
