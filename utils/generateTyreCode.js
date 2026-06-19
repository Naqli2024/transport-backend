const Tyre = require("../models/Tyre");

const generateTyreCode = async () => {
  const latestTyre = await Tyre.findOne().sort({ createdAt: -1 });

  let nextNumber = 1;

  if (latestTyre?.tyreCode) {
    const match = latestTyre.tyreCode.match(/\d+/);

    if (match) {
      nextNumber = parseInt(match[0]) + 1;
    }
  }

  return `TYR${String(nextNumber).padStart(5, "0")}`;
};

module.exports = generateTyreCode;
