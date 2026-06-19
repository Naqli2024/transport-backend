function getDocumentStatus(date) {
  if (!date) return "N/A";

  const today = new Date();

  const expiry = new Date(date);

  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Expired";

  if (diffDays <= 30) return `Due in ${diffDays}d`;

  return "Valid";
};

module.exports = getDocumentStatus;