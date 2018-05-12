const AWS = require('aws-sdk');

const s3 = new AWS.S3({ params: { Bucket: process.env.IDENTITY_MIND_S3_BUCKET }});

function s3Upload(key, stream) {
  return s3.upload({ Key: key, Body: stream}).promise();
}

module.exports = { s3, s3Upload };
