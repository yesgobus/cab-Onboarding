//upload multi image to aws s3
const AWS = require("aws-sdk");
require("aws-sdk/lib/maintenance_mode_message").suppress = true;

const bucketName = process.env.AWS_BUCKET_NAME;

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
};

const S3 = new AWS.S3(awsConfig);


//upload to s3
const uploadToS3 = (fileData) => {
  //const decodedFileData = Buffer.from(fileData, 'base64')
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

// Example usage:

const deleteFile = (fileName) => {
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

module.exports = { uploadToS3, deleteFile };
