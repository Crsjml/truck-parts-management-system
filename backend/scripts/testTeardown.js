import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
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

const prisma = new PrismaClient();

async function teardown(email) {
  try {
    console.log(`Starting teardown for ${email}...`);
    
    // 1. Find user in Supabase Auth via Admin API
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    
    const user = usersData.users.find(u => u.email === email);
    
    if (user) {
      // 2. Delete from Supabase Auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
      console.log(`Deleted user ${user.id} from Supabase Auth.`);
      
      // 3. Delete from Prisma Customer DB
      try {
        await prisma.customer.delete({ where: { authId: user.id } });
        console.log(`Deleted customer ${user.id} from Prisma Database.`);
      } catch (err) {
        if (err.code === 'P2025') {
          console.log(`Customer record for ${user.id} not found in DB (already deleted or never synced).`);
        } else {
          throw err;
        }
      }
    } else {
      console.log(`User ${email} not found in Supabase Auth.`);
    }
  } catch (err) {
    console.error(`Teardown failed for ${email}:`, err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const emailArgs = process.argv.slice(2);
if (emailArgs.length === 0) {
  console.error('Please provide an email to teardown.');
  process.exit(1);
}

teardown(emailArgs[0]).then(() => process.exit(0));
