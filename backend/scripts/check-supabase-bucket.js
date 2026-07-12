import { supabase } from '../src/config/supabase.js';

async function setupBucket() {
  const bucketName = 'parts-images';
  
  console.log(`Checking if bucket '${bucketName}' exists...`);
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error listing buckets:', error.message);
    process.exit(1);
  }

  const bucketExists = buckets.find(b => b.name === bucketName);
  
  if (bucketExists) {
    console.log(`✅ Bucket '${bucketName}' already exists. It is set to Public: ${bucketExists.public}`);
  } else {
    console.log(`Bucket '${bucketName}' not found. Creating it...`);
    const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });
    
    if (createError) {
      console.error('❌ Error creating bucket:', createError.message);
      process.exit(1);
    }
    console.log(`✅ Successfully created public bucket '${bucketName}'.`);
  }
}

setupBucket();
