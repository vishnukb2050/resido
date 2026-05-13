import { PrismaClient } from '@resido/user-client';
import axios from 'axios';

const prisma = new PrismaClient();

const DATA_URL = 'https://raw.githubusercontent.com/saravanakumargn/All-India-Pincode-Directory/master/all-india-pincode-json-array.json';

async function ingest() {
  console.log('🚀 Starting Location Ingestion...');
  
  try {
    console.log('📥 Fetching data from GitHub...');
    const response = await axios.get(DATA_URL);
    const rawData = response.data;

    if (!Array.isArray(rawData)) {
      throw new Error('Data format is not an array');
    }

    console.log(`📦 Found ${rawData.length} entries. Processing...`);

    // We use a batch size to avoid memory issues and DB transaction limits
    const BATCH_SIZE = 5000;
    let processed = 0;

    // Clear existing data (optional, but good for fresh start)
    // console.log('🧹 Clearing existing LocationMaster data...');
    // await prisma.locationMaster.deleteMany();

    for (let i = 0; i < rawData.length; i += BATCH_SIZE) {
      const batch = rawData.slice(i, i + BATCH_SIZE);
      
      const dataToInsert = batch.map((item: any) => {
        const placeName = item.officename.replace(/ B\.O| S\.O| H\.O/g, '').trim();
        const pincode = String(item.pincode);
        const district = item.Districtname;
        const state = item.statename;
        
        // Construct optimized search string
        const searchStr = `${placeName} ${pincode} ${district} ${state}`.toLowerCase();

        return {
          placeName,
          pincode,
          district,
          state,
          searchStr,
        };
      });

      await prisma.locationMaster.createMany({
        data: dataToInsert,
        skipDuplicates: true,
      });

      processed += batch.length;
      console.log(`✅ Processed ${processed}/${rawData.length} entries...`);
    }

    console.log('🎉 Ingestion completed successfully!');
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

ingest();
