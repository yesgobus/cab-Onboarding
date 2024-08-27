import AWS from 'aws-sdk';

// Suppress maintenance mode message
AWS.config.update({ 
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION 
});

const bucketName = process.env.AWS_BUCKET_NAME;
const S3 = new AWS.S3();

// Upload to S3
export const uploadToS3 = (fileData) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: bucketName,
      Key: `cabdriver/${Date.now().toString()}.jpg`,
      Body: fileData,
    };
    S3.upload(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data.Location);
    });
  });
};

// Delete file from S3
export const deleteFile = (fileName) => {
  const parsedUrl = new URL(fileName);
  const objectKey = parsedUrl.pathname.substring(1);
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: bucketName,
      Key: objectKey,
    };
    S3.deleteObject(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(true);
    });
  });
};
