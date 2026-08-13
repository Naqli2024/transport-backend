const { Storage } = require("@google-cloud/storage");

const storageConfigs = JSON.parse(
  process.env.GCP_STORAGE_CONFIGS || "{}"
);

const getBucket = (businessId) => {
  if (!businessId) {
    throw new Error("Business ID is required for GCP storage");
  }

  const config = storageConfigs[businessId];

  if (!config) {
    throw new Error(
      `GCP storage configuration not found for businessId: ${businessId}`
    );
  }

  const storage = new Storage({
    projectId: config.projectId,
    keyFilename: config.credentials,
  });

  return storage.bucket(config.bucket);
};

exports.uploadFile = async (file, businessId, folder) => {
  const bucket = getBucket(businessId);

  const fileName = `businesses/${businessId}/${folder}/${Date.now()}-${file.originalname}`;

  const blob = bucket.file(fileName);

  await blob.save(file.buffer, {
    contentType: file.mimetype,
    resumable: false,
  });

  return fileName;
};

exports.getSignedUrl = async (filePath, businessId) => {
  const bucket = getBucket(businessId);

  const file = bucket.file(filePath);

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 1000 * 60 * 60,
  });

  return url;
};

exports.deleteFile = async (filePath, businessId) => {
  try {
    const bucket = getBucket(businessId);

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
  const newFilePath = await exports.uploadFile(
    newFile,
    businessId,
    folder
  );

  if (oldFilePath) {
    await exports.deleteFile(
      oldFilePath,
      businessId
    );
  }

  return newFilePath;
};