const { Storage } = require("@google-cloud/storage");
const path = require("path");

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,

  ...(process.env.GCP_SERVICE_ACCOUNT
    ? {
        credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT),
      }
    : {
        keyFilename: path.join(
          process.cwd(),
          process.env.GCP_KEY_FILE
        ),
      }),
});

const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);

exports.uploadFile = async (file, businessId, folder) => {

  const fileName = `businesses/${businessId}/${folder}/${Date.now()}-${file.originalname}`;

  const blob = bucket.file(fileName);

  await blob.save(file.buffer, {
    contentType: file.mimetype,
    resumable: false,
  });

  // Return GCS object path
  return fileName;
};

// Generate temporary URL
exports.getSignedUrl = async (filePath) => {

  const file = bucket.file(filePath);

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 1000 * 60 * 60, // 1 hour
  });

  return url;
};

exports.deleteFile = async (filePath) => {
  try {
    const file = bucket.file(filePath);

    const [exists] = await file.exists();

    if (exists) {
      await file.delete();
    }
  } catch (error) {
    console.error("GCS Delete Error:", error.message);
  }
};

exports.replaceFile = async (
  newFile,
  businessId,
  folder,
  oldFilePath
) => {

  // Upload new file
  const newFilePath = await exports.uploadFile(
    newFile,
    businessId,
    folder
  );

  // Delete old file
  if (oldFilePath) {
    await exports.deleteFile(oldFilePath);
  }

  return newFilePath;
};