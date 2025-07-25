function extractJSON(text) {
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log("JSON parse error:", e);
    }
  }

  // If no JSON found, try to extract from code blocks
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

function validateParsedData(data) {
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

  if (typeof data.amount !== "number" || data.amount <= 0) {
    return { valid: false, error: "Amount must be a positive number" };
  }

  return { valid: true };
}

function preprocessHindiQuery(query) {
  // Normalize Hindi pronouns and common variations
  let normalized = query.toLowerCase();

  // Normalize "from me" variations
  normalized = normalized.replace(/mere se|mujh se/g, "mujhse");

  // Normalize "to me" variations
  normalized = normalized.replace(/mere ko|mujh ko/g, "mujhe");

  // Normalize verb forms
  normalized = normalized.replace(/liye the|liya tha|liye hain/g, "liye");
  normalized = normalized.replace(/diye the|diya tha|diye hain/g, "diye");
  return normalized;
}

async function processQuery() {
  const apiKey = document.getElementById("apiKey").value.trim();
  const query = document.getElementById("query").value.trim();
  const outputBox = document.getElementById("output");
  const submitBtn = document.getElementById("submitBtn");

  // Validation
  if (!apiKey) {
    outputBox.textContent = "Please enter your Gemini API Key";
    outputBox.className = "output-box error";
    return;
  }

  if (!query) {
    outputBox.textContent = "Please enter an expense query";
    outputBox.className = "output-box error";
    return;
  }

  const processedQuery = preprocessHindiQuery(query);
  outputBox.textContent = "Processing your query...";
  outputBox.className = "output-box loading";
  submitBtn.disabled = true;
  submitBtn.textContent = "Processing...";

  const prompt = `
  You are an expense tracking assistant that understands Hindi, English, and Hinglish. Analyze the following expense input and return ONLY a JSON object with no additional text or formatting.

  The JSON should have this exact structure:
  {
    "type": "expense" | "toPay" | "toGet",
    "amount": number,
    "toWhom": string (only if type is "toPay"),
    "fromWhom": string (only if type is "toGet"), 
    "category": string (food, transportation, shopping, entertainment, etc, 'none' if not applicable))
  }

  CRITICAL HINDI/HINGLISH PATTERNS - PAY CLOSE ATTENTION:

  WHEN SOMEONE BORROWED FROM ME (type: "toGet"):
  - "[person] ne mere se [amount] liye" = [person] borrowed from ME → type: "toGet", fromWhom: [person]
  - "[person] ne mujhse [amount] liye" = [person] borrowed from ME → type: "toGet", fromWhom: [person]
  - "[person] ne mujh se [amount] liye" = [person] borrowed from ME → type: "toGet", fromWhom: [person]
  - "maine [person] ko [amount] diye" = I lent to [person] → type: "toGet", fromWhom: [person]

  WHEN I BORROWED FROM SOMEONE (type: "toPay"):
  - "maine [person] se [amount] liye" = I borrowed from [person] → type: "toPay", toWhom: [person]
  - "[person] ne mujhe [amount] diye" = [person] lent me money → type: "toPay", toWhom: [person]

  DEBT TRACKING:
  - "[person] ko [amount] dena hai" = I owe [person] → type: "toPay", toWhom: [person]
  - "[person] se [amount] lena hai" = [person] owes me → type: "toGet", fromWhom: [person]

  KEY HINDI PRONOUNS TO UNDERSTAND:
  - "mere se" = "mujhse" = "mujh se" = FROM ME
  - "mujhe" = TO ME
  - "maine" = I (did something)

  EXAMPLES:
  - "mama ne mere se 200 liye" → {"type": "toGet", "amount": 200, "fromWhom": "mama"}
  - "maine mama se 200 liye" → {"type": "toPay", "amount": 200, "toWhom": "mama"}

  EXPENSE RULES:
  - "expense" = I spent money on something (shopping, food, etc.) - no person-to-person transaction
  - "toPay" = I owe money to someone (I need to pay them back)
  - "toGet" = Someone owes money to me (they need to pay me back)

  Extract amount as a number (remove currency symbols like rupees, rs, ₹).
  Categorize appropriately (food, transportation, shopping, entertainment, loan, etc.).
  Return ONLY the JSON object.

  Text: "${processedQuery}"
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message || "API returned an error");
    }

    const geminiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!geminiResponse) {
      throw new Error("No response received from Gemini");
    }

    // Try to extract and parse JSON
    const parsed = extractJSON(geminiResponse);

    if (!parsed) {
      outputBox.innerHTML = `<strong>Raw Gemini Response:</strong>\n${geminiResponse}\n\n<strong>Error:</strong> Could not extract valid JSON from response`;
      outputBox.className = "output-box error";
      return;
    }

    // Validate the parsed data
    const validation = validateParsedData(parsed);
    if (!validation.valid) {
      outputBox.innerHTML = `<strong>Parsed Data:</strong>\n${JSON.stringify(parsed, null, 2)}\n\n<strong>Validation Error:</strong> ${validation.error}`;
      outputBox.className = "output-box error";
      return;
    }

    // Success - display the parsed result
    outputBox.textContent = JSON.stringify(parsed, null, 2);
    outputBox.className = "output-box success";

    console.log("Successfully parsed:", parsed);

    //post request to the backend
    await saveToBackend(parsed);
  } catch (error) {
    console.error("Error:", error);
    outputBox.textContent = `Error: ${error.message}`;
    outputBox.className = "output-box error";
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
}

async function processQuery1() {
  const apiKey = document.getElementById("apiKey").value.trim();
  const query = document.getElementById("query1").value.trim();
  const outputBox = document.getElementById("output");
  const submitBtn = document.getElementById("submitBtn1");

  // Validation
  if (!apiKey) {
    outputBox.textContent = "Please enter your Gemini API Key";
    outputBox.className = "output-box error";
    return;
  }

  if (!query) {
    outputBox.textContent = "Please enter an expense query";
    outputBox.className = "output-box error";
    return;
  }

  const processedQuery = preprocessHindiQuery(query);
  outputBox.textContent = "Processing your query...";
  outputBox.className = "output-box loading";
  submitBtn.disabled = true;
  submitBtn.textContent = "Processing...";

  const queryPrompt = `
  You are an intelligent financial query parser that understands Hindi, English, and Hinglish.

  Your job is to analyze a user's message asking about their financial records, and return ONLY a clean JSON object — no extra commentary, no markdown, and no explanation.

  The structure of the returned JSON must be:

  {
    "type": "expense" | "toPay" | "toGet",
    "toWhom": string (only if type is "toPay"),
    "fromWhom": string (only if type is "toGet"),
    "category": string (optional; default to "all" if not provided)
  }

  RULES:

  🔹 GENERAL EXPENSE QUERY:
  - "abtak kitna kharch hua", "kitne paise kharch hue", "abtk total expenses" → type: "expense", category: "all"
  - "kitna paisa food mein gaya", "kitna shopping hua", etc. → type: "expense", category: ["food", "shopping", etc.]

  🔹 toPay QUERIES (I OWE someone):
  - "deepak ko kitne paise dene hain", "maine ansh se kitne liye" → type: "toPay", toWhom: "deepak"/"ansh"
  - "ab tak kis kis ko dena hai", "total toPay entries" → type: "toPay"

  🔹 toGet QUERIES (someone OWES me):
  - "ansh ne mujhse kitne liye", "kitne paise lene hain", "ab tak mujhe kis kis se paise lene hain" → type: "toGet", fromWhom: "ansh"
  - "total toGet entries" → type: "toGet"

  ✅ Normalize names to lowercase unless proper casing is obvious.
  ✅ If category isn't explicitly mentioned, default to "all".
  ✅ Only return valid JSON with keys as shown above — no extra text.

  Text: "${processedQuery}"
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: queryPrompt }] }],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message || "API returned an error");
    }

    const geminiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!geminiResponse) {
      throw new Error("No response received from Gemini");
    }

    // Try to extract and parse JSON
    const parsed = extractJSON(geminiResponse);

    if (!parsed) {
      outputBox.innerHTML = `<strong>Raw Gemini Response:</strong>\n${geminiResponse}\n\n<strong>Error:</strong> Could not extract valid JSON from response`;
      outputBox.className = "output-box error";
      return;
    }

    // Validate the parsed data
    outputBox.innerHTML = `<strong>Parsed Data:</strong>\n${JSON.stringify(parsed, null, 2)}\n`;
    outputBox.className = "output-box error";

    // Success - display the parsed result
    outputBox.textContent = JSON.stringify(parsed, null, 2);
    outputBox.className = "output-box success";

    console.log("Successfully parsed:", parsed);

    //post request to the backend
    const backendResponse = await saveToBackend1(parsed);

    if (backendResponse) {
      outputBox.textContent = `\n\n🔄 Backend Response:\n${JSON.stringify(backendResponse, null, 2)}`;
      outputBox.className = "output-box success";
    }
  } catch (error) {
    console.error("Error:", error);
    outputBox.textContent = `Error: ${error.message}`;
    outputBox.className = "output-box error";
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
}

async function saveToBackend(data) {
  try {
    const response = await fetch(
      "https://407e58ec-8c85-460b-b258-b2be45836e13-00-3grgi1z3o3r5s.pike.repl.co:3000/v1/save",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Saved to backend:", result);
    return result;
  } catch (error) {
    console.error("Backend save error:", error);
  }
}

async function saveToBackend1(data) {
  try {
    const queryParams = new URLSearchParams(data).toString();
    const response = await fetch(
      `https://407e58ec-8c85-460b-b258-b2be45836e13-00-3grgi1z3o3r5s.pike.repl.co:3000/v1/save1?${queryParams}`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Queried from backend:", result);
    return result;
  } catch (error) {
    console.error("Backend query error:", error);
  }
}
