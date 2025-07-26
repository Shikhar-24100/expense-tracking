
import { extractJSON, preprocessHindiQuery, detectQueryType } from './utils/textProcessing.js';
import { validateParsedData } from './utils/validation.js';
import { GeminiService, BackendService } from './services/apiServices.js';


let geminiService;
let backendService = new BackendService();


class UIController {
  constructor() {
    this.outputBox = document.getElementById("output");
    this.submitBtn = document.getElementById("submitBtn");
  }

  showLoading(message = "Processing your query...") {
    this.outputBox.textContent = message;
    this.outputBox.className = "output-box loading";
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = "Processing...";
  }

  showError(message) {
    this.outputBox.textContent = `Error: ${message}`;
    this.outputBox.className = "output-box error";
    this.resetButton();
  }

  showSuccess(message, data) {
    this.outputBox.textContent = `${message}\n${JSON.stringify(data, null, 2)}`;
    this.outputBox.className = "output-box success";
    this.resetButton();
  }

  showRawResponse(title, content) {
    this.outputBox.innerHTML = `<strong>${title}:</strong>\n${content}`;
    this.outputBox.className = "output-box error";
    this.resetButton();
  }

  resetButton() {
    this.submitBtn.disabled = false;
    this.submitBtn.textContent = "Submit";
  }
}

const ui = new UIController();

//Main processing function
export async function processUnifiedQuery() {
  const apiKey = document.getElementById("apiKey").value.trim();
  const query = document.getElementById("unifiedQuery").value.trim();

  if (!apiKey) {
    ui.showError("Please enter your Gemini API Key");
    return;
  }

  if (!query) {
    ui.showError("Please enter your query");
    return;
  }

  
  geminiService = new GeminiService(apiKey);

  const processedQuery = preprocessHindiQuery(query);
  const queryType = detectQueryType(processedQuery);

  ui.showLoading(`Processing your ${queryType}...`);

  try {
    if (queryType === 'transaction') {
      await processTransaction(processedQuery);
    } else {
      await processQueryRequest(processedQuery);
    }
  } catch (error) {
    console.error("Error:", error);
    ui.showError(error.message);
  }
}


async function processTransaction(processedQuery) {
  try {
    const geminiResponse = await geminiService.processTransaction(processedQuery);

    //try to extract and parse JSON
    const parsed = extractJSON(geminiResponse);

    if (!parsed) {
      ui.showRawResponse(
        "Raw Gemini Response", 
        `${geminiResponse}\n\nError: Could not extract valid JSON from response`
      );
      return;
    }

    //validate the parsed data
    const validation = validateParsedData(parsed);
    if (!validation.valid) {
      ui.showRawResponse(
        "Validation Error",
        `Parsed Data: ${JSON.stringify(parsed, null, 2)}\n\nError: ${validation.error}`
      );
      return;
    }

    await backendService.saveTransaction(parsed);

    ui.showSuccess("✅ Transaction Added:", parsed);

  } catch (error) {
    throw new Error(`Transaction processing failed: ${error.message}`);
  }
}


async function processQueryRequest(processedQuery) {
  try {
    const geminiResponse = await geminiService.processQuery(processedQuery);


    const parsed = extractJSON(geminiResponse);

    if (!parsed) {
      ui.showRawResponse(
        "Raw Gemini Response",
        `${geminiResponse}\n\nError: Could not extract valid JSON from response`
      );
      return;
    }

    console.log("Successfully parsed query:", parsed);

    const backendResponse = await backendService.queryData(parsed);

    if (backendResponse) {
      ui.showSuccess("📊 Query Results:", backendResponse);
    } else {
      ui.showSuccess("📋 Query Processed:", parsed);
    }

  } catch (error) {
    throw new Error(`Query processing failed: ${error.message}`);
  }
}

//make function globally available for HTML onclick
window.processUnifiedQuery = processUnifiedQuery;