import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
global.WebSocket = WebSocket;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role has bypass

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const email = `johndoe_${Date.now()}@gmail.com`;
const password = 'TestPassword123!';

async function runTest() {
  console.log('1. Registering user with Supabase Auth (Admin API)...');
  const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (adminError) {
    console.error('Registration failed:', adminError.message);
    return;
  }
  
  console.log(`Registration successful! User ID: ${adminData.user.id}`);
  console.log('2. Signing in to get JWT token...');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  const token = authData?.session?.access_token;
  if (!token) {
    console.error('No token received after login:', authError?.message);
    return;
  }
  
  console.log(`Registration successful! User ID: ${authData.user.id}`);
  console.log('2. Querying GET /api/customers/me using the JWT...');

  const res = await fetch('http://localhost:5001/api/customers/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (res.ok) {
    const customer = await res.json();
    console.log('✅ Protected endpoint returned 200 OK!');
    console.log('Customer Data:', customer);
  } else {
    console.error(`❌ Request failed with status ${res.status}`);
    const text = await res.text();
    console.error('Response:', text);
  }
}

runTest();
