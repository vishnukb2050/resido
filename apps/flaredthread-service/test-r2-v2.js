const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

async function testR2() {
    const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'auto',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        endpoint: process.env.AWS_S3_ENDPOINT,
    });

    console.log('--- Testing R2 ListBuckets ---');
    
    try {
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);
        console.log('✅ ListBuckets successful:', response.Buckets.map(b => b.Name));
    } catch (error) {
        console.error('❌ R2 Auth Failed:', error.message);
    }
}

testR2();
