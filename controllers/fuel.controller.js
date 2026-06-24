// const Fuel = require("../models/Fuel");
// const Driver = require("../models/Driver");
// const Vehicle = require("../models/Vehicle");
// const { uploadFile } = require("../utils/gcpUpload");
// const { extractText } = require("../utils/visionOCR");
// const { parseFuelBill } = require("../utils/parseFuelBill");

// exports.uploadFuelBill = async (req, res) => {
//   try {
//     const businessId = req.user.businessId;
//     const { vehicleId, driverId, odometer } = req.body;
//     console.log("STEP 1: Request received");

//     console.log("STEP 2: Uploading to GCS...");
//     const imageUrl = await uploadFile(req.file, req.user.businessId);
    
//     console.log("STEP 3: Upload completed");
//     console.log("IMAGE URL:", imageUrl);

//     console.log("STEP 4: Starting OCR...");
//     const extractedText = await extractText(imageUrl);

//     console.log("STEP 5: OCR completed");
//     console.log(extractedText);

//     console.log("STEP 6: Parsing bill...");
//     const parsed = parseFuelBill(extractedText);
//     const vehicle = await Vehicle.findById(vehicleId);
//     const driver = await Driver.findById(driverId);

//     console.log("STEP 7: Saving fuel entry");
//     const fuel = await Fuel.create({
//       businessId,
//       vehicleId,
//       regNo: vehicle?.regNo,
//       driverId,
//       driverName: driver?.name,
//       fuelDate: new Date(),
//       litres: parsed.litres,
//       amount: parsed.amount,
//       pricePerLitre: parsed.litres ? parsed.amount / parsed.litres : 0,
//       odometer,
//       billImage: imageUrl,
//       extractedText,
//     });

//     console.log("STEP 8: Saved");
//     res.status(201).json({
//       success: true,
//       message: "Fuel bill uploaded successfully",
//       data: fuel,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
