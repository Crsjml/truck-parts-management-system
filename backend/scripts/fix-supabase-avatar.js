import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  const users = data.users;
  for (const user of users) {
    if (user.user_metadata?.avatar_url && user.user_metadata.avatar_url.startsWith('data:image')) {
      console.log(`Fixing user ${user.email} bloated avatar...`);
      await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_metadata: { ...user.user_metadata, avatar_url: null }
        })
      });
      console.log('Fixed.');
    }
  }
  console.log('Done.');
}
run();
