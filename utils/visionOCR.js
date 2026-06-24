const vision = require("@google-cloud/vision");
const path = require("path");

console.log(
  "OCR KEY FILE:",
  path.join(process.cwd(), "gcp-key.json")
);

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(
    process.cwd(),
    "gcp-key.json"
  ),
});

exports.extractText = async (gcsUri) => {
  try {
    console.log("OCR START:", gcsUri);

    const [result] =
      await client.textDetection({
        image: {
          source: {
            imageUri: gcsUri,
          },
        },
      });

    console.log(
      "OCR RESPONSE:",
      JSON.stringify(result, null, 2)
    );

    return (
      result.fullTextAnnotation?.text || ""
    );
  } catch (error) {
    console.error(
      "OCR ERROR:",
      error
    );

    throw error;
  }
};