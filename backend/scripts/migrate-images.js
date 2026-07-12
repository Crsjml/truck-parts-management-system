import { prisma } from '../src/config/prisma.js';
import { supabaseStorageService } from '../src/services/SupabaseStorageService.js';

async function migrateImages() {
  console.log('🔍 Starting image migration...');

  try {
    // Find all parts where the image field contains a base64 string
    const partsWithBase64 = await prisma.part.findMany({
      where: {
        image: {
          startsWith: 'data:image/'
        }
      },
      select: {
        id: true,
        sku: true,
        image: true
      }
    });

    console.log(`Found ${partsWithBase64.length} parts with Base64 images.`);

    let successCount = 0;
    let failCount = 0;

    for (const part of partsWithBase64) {
      console.log(`Processing SKU: ${part.sku} (ID: ${part.id})...`);
      try {
        // Upload to Supabase
        const publicUrl = await supabaseStorageService.uploadBase64Image(part.image);

        // Update record
        await prisma.part.update({
          where: { id: part.id },
          data: { image: publicUrl }
        });

        console.log(`✅ Success: ${part.sku} -> ${publicUrl}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to process ${part.sku}:`, error.message);
        failCount++;
      }
    }

    console.log('\n--- Migration Complete ---');
    console.log(`Total Processed: ${partsWithBase64.length}`);
    console.log(`Successfully Migrated: ${successCount}`);
    console.log(`Failed: ${failCount}`);

  } catch (error) {
    console.error('Fatal error during migration:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

migrateImages();
