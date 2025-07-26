
import { TRANSACTION_PROMPT, QUERY_PROMPT } from '../prompts/promptTemplates.js';

export class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  }

  async makeRequest(prompt) {
    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

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

    return geminiResponse;
  }

  async processTransaction(query) {
    const prompt = TRANSACTION_PROMPT.replace('${processedQuery}', query);
    return await this.makeRequest(prompt);
  }

  async processQuery(query) {
    const prompt = QUERY_PROMPT.replace('${processedQuery}', query);
    return await this.makeRequest(prompt);
  }
}

export class BackendService {
  constructor(baseUrl = 'https://407e58ec-8c85-460b-b258-b2be45836e13-00-3grgi1z3o3r5s.pike.repl.co:3000') {
    this.baseUrl = baseUrl;
  }

  async saveTransaction(data) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Saved to backend:", result);
      return result;
    } catch (error) {
      console.error("Backend save error:", error);
      throw error;
    }
  }

  async queryData(params) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(`${this.baseUrl}/v1/save?${queryParams}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Queried from backend:", result);
      return result;
    } catch (error) {
      console.error("Backend query error:", error);
      throw error;
    }
  }
}