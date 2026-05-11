const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

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

    console.log('--- Testing R2 Connectivity ---');
    
    try {
        // 1. List Objects (Read Test)
        console.log('Testing ListObjects...');
        const listCommand = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 5 });
        const listResponse = await s3Client.send(listCommand);
        console.log('✅ List successful. Found:', listResponse.KeyCount, 'objects');

        // 2. Upload Test (Write Test)
        console.log('Testing Upload...');
        const testKey = `connection_test_${Date.now()}.txt`;
        const uploadCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: testKey,
            Body: 'R2 Connection Test Successful',
            ContentType: 'text/plain',
        });
        await s3Client.send(uploadCommand);
        console.log('✅ Upload successful. Key:', testKey);

        console.log('\n--- R2 Connection: OK ---');
    } catch (error) {
        console.error('\n❌ R2 Connection Failed:', error.message);
        if (error.$metadata) {
            console.error('HTTP Status:', error.$metadata.httpStatusCode);
        }
    }
}

testR2();
