import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'ttp-mgmt-sys'
});

async function listUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    console.log(`Found ${listUsersResult.users.length} users in Firebase Auth.`);
    listUsersResult.users.forEach((userRecord) => {
      console.log(`- ${userRecord.email} (${userRecord.uid})`);
    });
  } catch (error) {
    console.error('Error listing users:', error);
  }
}

listUsers();
