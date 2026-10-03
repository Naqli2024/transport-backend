const Location = require("../models/Location");

// GET ALL ACTIVE LOCATIONS
const getLocations = async (req, res) => {
  try {
    const locations = await Location.find({
      status: "ACTIVE",
    })
      .sort({ name: 1 })
      .select("_id name status");

    return res.status(200).json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error("Get locations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch locations",
    });
  }
};

// ADD NEW LOCATION
const addLocation = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Location name is required",
      });
    }

    const locationName = name.trim();

    const existingLocation = await Location.findOne({
      name: {
        $regex: `^${locationName}$`,
        $options: "i",
      },
    });

    if (existingLocation) {
      return res.status(409).json({
        success: false,
        message: "Location already exists",
      });
    }

    const location = await Location.create({
      name: locationName,
    });

    return res.status(201).json({
      success: true,
      message: "Location added successfully",
      data: location,
    });
  } catch (error) {
    console.error("Add location error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add location",
    });
  }
};

module.exports = {
  getLocations,
  addLocation,
};