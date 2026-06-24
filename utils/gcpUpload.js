const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");

console.log("KEY FILE:", process.env.GCP_KEY_FILE);

console.log(
  "EXISTS:",
  fs.existsSync(process.env.GCP_KEY_FILE)
);

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
   keyFilename: path.join(
    process.cwd(),
    process.env.GCP_KEY_FILE
  ),
});

const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);

exports.uploadFile = async (file, businessId) => {
  const fileName = `businesses/${businessId}/fuel-bills/${Date.now()}-${file.originalname}`;

  const blob = bucket.file(fileName);

  await blob.save(file.buffer, {
    contentType: file.mimetype,
  });

  return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
};
