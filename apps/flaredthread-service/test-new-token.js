const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

async function testR2() {
    const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'auto',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        endpoint: process.env.AWS_S3_ENDPOINT,
        forcePathStyle: true,
    });

    const bucketName = 'resido';

    console.log('--- Testing R2 with NEW Token ---');
    
    try {
        const listCommand = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 });
        await s3Client.send(listCommand);
        console.log('✅ SUCCESS! The Bearer Token worked as an S3 Secret Key.');
    } catch (error) {
        console.error('❌ FAILED:', error.message);
        console.log('\nExplanation: Cloudflare API Tokens (cfat_...) are not S3 Secret Keys.');
        console.log('You need to go to R2 -> Manage R2 API Tokens and get the S3 Credentials.');
    }
}

testR2();
