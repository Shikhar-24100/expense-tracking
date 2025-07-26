
export function extractJSON(text) {
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log("JSON parse error:", e);
    }
  }

  //bullshit
  
  //If no JSON found, try to extract from code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch (e) {
      console.log("Code block JSON parse error:", e);
    }
  }

  return null;
}

export function preprocessHindiQuery(query) {
  
  let normalized = query.toLowerCase();

  normalized = normalized.replace(/mere se|mujh se/g, "mujhse");
  //mere se mujh se are not that hindi honestly

  normalized = normalized.replace(/mere ko|mujh ko/g, "mujhe");

  normalized = normalized.replace(/liye the|liya tha|liye hain/g, "liye");
  normalized = normalized.replace(/diye the|diya tha|diye hain/g, "diye");
  return normalized;
}

export function detectQueryType(query) {
  const lowerQuery = query.toLowerCase();

  //asking for info
  const queryPatterns = [
    
    /kitna|kitne|kya|kaun|kis/,
    /abtak|ab tak|total|abtk/,
    /lene hain|dene hain|kharch hua|gaya/,
    /show|list|dikhao|batao/,

    /how much|how many|what|who|which/,
    /total|sum|all|show me|tell me/,
    /spent|owe|owed|borrowed|lent/
  ];

  //recording data
  const transactionPatterns = [
    
    /liye|diye|lia|dia/,
    /kharch kiya|kharcha|expense|spent/,
    /se liye|ko diye|ne liye|ne diye/,

    
    /bought|paid|spent|borrowed|lent|gave|took/,
    /from|to.*rupees|rs|₹.*for/
  ];

  //Check if it's a query first
  const isQuery = queryPatterns.some(pattern => pattern.test(lowerQuery));
  const isTransaction = transactionPatterns.some(pattern => pattern.test(lowerQuery));

  //If it has amount and transaction words, likely a transaction
  const hasAmount = /\d/.test(query);

  if (isQuery && !hasAmount) {
    return 'query';
  } else if (isTransaction && hasAmount) {
    return 'transaction';
  } else if (hasAmount) {
    return 'transaction'; //default to transaction if amount is present
  } else {
    return 'query'; //default to query if no amount
  }
}