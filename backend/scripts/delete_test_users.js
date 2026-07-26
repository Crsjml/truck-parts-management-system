import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log("Fetching users...");
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error("Error fetching users:", error);
    process.exit(1);
  }
  
  const users = data.users;
  const targets = ["raphael_maagma@dlsu", "azhoraaaa"];
  let deletedCount = 0;
  
  for (const user of users) {
    if (targets.some(t => user.email && user.email.toLowerCase().includes(t.toLowerCase()))) {
      console.log(`Deleting user: ${user.email} (${user.id})...`);
      const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
      if (delError) {
        console.error(`Failed to delete ${user.email}:`, delError);
      } else {
        console.log(`Successfully deleted ${user.email}`);
        deletedCount++;
      }
    }
  }
  
  if (deletedCount === 0) {
    console.log("No matching users found to delete.");
  }
  console.log("Done.");
}

run();
