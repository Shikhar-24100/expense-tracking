// document.getElementById('query').addEventListener('keypress', function(e) {
//   if (e.key === 'Enter') {
//     processQuery();
//   }
// });

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

  outputBox.textContent = "Processing your query...";
  outputBox.className = "output-box loading";
  submitBtn.disabled = true;
  submitBtn.textContent = "Processing...";

  const prompt = `
You are an expense tracking assistant. Analyze the following expense input and return ONLY a JSON object with no additional text or formatting.

The JSON should have this exact structure:
{
"type": "expense" | "toPay" | "toGet",
"amount": number,
"toWhom": string (only if type is "toPay"),
"fromWhom": string (only if type is "toGet"), 
"category": string (food, transportation, shopping, entertainment, etc.)
}

Rules:
- "expense" = I spent money on something
- "toPay" = I owe money to someone  
- "toGet" = Someone owes money to me
- Extract amount as a number (remove currency symbols)
- Categorize expenses appropriately
- Return ONLY the JSON object

Text: "${query}"
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
