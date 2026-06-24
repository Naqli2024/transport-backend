exports.parseFuelBill = (text) => {
  const amountMatch = text.match(/\d+(?:,\d+)?(?:\.\d+)?/);

  const litresMatch = text.match(/(\d+(\.\d+)?)\s*L/i);

  return {
    amount: amountMatch ? Number(amountMatch[0].replace(",", "")) : 0,

    litres: litresMatch ? Number(litresMatch[1]) : 0,
  };
};
