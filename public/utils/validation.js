export function validateParsedData(data) {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid data structure" };
  }

  const validTypes = ["expense", "toPay", "toGet"];
  if (!validTypes.includes(data.type)) {
    return {
      valid: false,
      error: "Invalid type. Must be expense, toPay, or toGet",
    };
  }

  //for transaction data, amount is required
  if (data.amount !== undefined) {
    if (typeof data.amount !== "number" || data.amount <= 0) {
      return { valid: false, error: "Amount must be a positive number" };
    }
  }

  // Validate toPay specific fields
  if (data.type === "toPay" && data.amount && !data.toWhom) {
    return { valid: false, error: "toPay transactions require 'toWhom' field" };
  }

  // Validate toGet specific fields
  if (data.type === "toGet" && data.amount && !data.fromWhom) {
    return { valid: false, error: "toGet transactions require 'fromWhom' field" };
  }

  return { valid: true };
}

export function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return { valid: false, error: "API key is required" };
  }

  // Basic format validation for Gemini API keys
  if (!apiKey.startsWith('AI') || apiKey.length < 20) {
    return { valid: false, error: "Invalid API key format" };
  }

  return { valid: true };
}

export function validateQuery(query) {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return { valid: false, error: "Query cannot be empty" };
  }

  if (query.trim().length < 3) {
    return { valid: false, error: "Query too short. Please provide more details." };
  }

  return { valid: true };
}