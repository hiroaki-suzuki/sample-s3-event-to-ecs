import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

console.log('Hello, World!');
console.log(process.argv);
console.log(JSON.stringify(process.env));

(async (): Promise<void> => {
  const client = new S3Client({ region: process.env.AWS_DEFAULT_REGION });

  const key = process.argv[2];
  const command = new GetObjectCommand({
    Bucket: process.env.APP_S3_BUCKET_NAME,
    Key: key,
  });

  const response = await client.send(command);
  console.info(JSON.stringify(response.$metadata));
})();
