// main.js - Integrated Backend Logic + Frontend UI
import { extractJSON, preprocessHindiQuery, detectQueryType } from './utils/textProcessing.js';
import { validateParsedData } from './utils/validation.js';
import { GeminiService, BackendService } from './services/apiServices.js';

// Initialize services
let geminiService;
let backendService = new BackendService();

// DOM Elements
const expensesList = document.getElementById('expenses-list');
const toPayList = document.getElementById('to-pay-list');
const toGetList = document.getElementById('to-get-list');
const modal = document.getElementById('entry-modal');
const modalTitle = document.getElementById('modal-title');
const field1 = document.getElementById('field1');
const field2 = document.getElementById('field2');
const entryForm = document.getElementById('entry-form');
const entryText = document.getElementById('entry-text');
const aiFormContainer = document.getElementById('ai-form-container');
const aiStatus = document.getElementById('ai-status');

// Data storage - Enhanced with backend sync
let expenses = [];
let toPay = [];
let toGet = [];
let currentType = null;
let aiEnabled = false;

// Initialize app
function init() {
  loadData();
  updateStats();
  renderAllLists();
  setupEventListeners();
}

// Enhanced data persistence with backend sync
async function saveData() {
  const data = { expenses, toPay, toGet };
  localStorage.setItem('expenseData', JSON.stringify(data));
  console.log('Data saved locally:', data);

  // Optionally sync with backend
  // await syncWithBackend();
}

function loadData() {
  const savedData = localStorage.getItem('expenseData');
  if (savedData) {
    const data = JSON.parse(savedData);
    expenses = data.expenses || [];
    toPay = data.toPay || [];
    toGet = data.toGet || [];
  }
}

// Modal functions (unchanged)
function openModal(type) {
  currentType = type;
  modal.style.display = 'flex';

  const configs = {
    expenses: { title: '💰 Add Expense', placeholder: 'What did you spend on?' },
    toPay: { title: '🧾 Add Payment Due', placeholder: 'Who do you owe?' },
    toGet: { title: '📥 Add Money to Collect', placeholder: 'Who owes you?' }
  };

  const config = configs[type];
  modalTitle.innerText = config.title;
  field1.placeholder = config.placeholder;
  field1.value = '';
  field2.value = '';
  field1.focus();
}

function closeModal() {
  modal.style.display = 'none';
}

async function submitModal() {
  const label = field1.value.trim();
  const amount = parseFloat(field2.value);

  if (!label || !amount || amount <= 0) {
    alert('Please enter valid details');
    return;
  }

  const entry = { 
    id: Date.now(), 
    label, 
    amount, 
    date: new Date().toLocaleDateString(),
    category: label.toLowerCase()
  };

  // Add to appropriate array
  if (currentType === 'expenses') expenses.push(entry);
  else if (currentType === 'toPay') toPay.push(entry);
  else if (currentType === 'toGet') toGet.push(entry);

  await saveData();
  renderAllLists();
  updateStats();
  closeModal();

  // Optional: Sync with backend
  await syncEntryWithBackend(entry, currentType);
}

// Enhanced AI entry processing with your backend logic
async function processAIEntry(text) {
  if (!aiEnabled || !geminiService) {
    alert('AI mode not enabled. Please enter your API key first.');
    return;
  }

  try {
    // Use your backend logic
    const processedQuery = preprocessHindiQuery(text);
    const queryType = detectQueryType(processedQuery);

    // Show processing status
    aiStatus.textContent = `Processing ${queryType}... 🤖`;
    aiStatus.className = 'status-active';

    let geminiResponse;
    if (queryType === 'transaction') {
      geminiResponse = await geminiService.processTransaction(processedQuery);
      await handleTransactionResponse(geminiResponse);
    } else {
      geminiResponse = await geminiService.processQuery(processedQuery);
      await handleQueryResponse(geminiResponse);
    }

  } catch (error) {
    console.error('AI processing error:', error);
    aiStatus.textContent = `Error: ${error.message} ❌`;
    aiStatus.className = 'status-waiting';
    alert(`AI Error: ${error.message}`);
  }
}

async function handleTransactionResponse(geminiResponse) {
  const parsed = extractJSON(geminiResponse);

  if (!parsed) {
    throw new Error('Could not extract valid JSON from AI response');
  }

  const validation = validateParsedData(parsed);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  // Convert AI response to frontend format
  const entry = {
    id: Date.now(),
    label: parsed.toWhom || parsed.fromWhom || parsed.category || 'AI Entry',
    amount: parsed.amount,
    date: new Date().toLocaleDateString(),
    category: parsed.category || 'ai-generated',
    aiData: parsed // Store original AI data
  };

  // Add to appropriate list based on AI classification
  if (parsed.type === 'expense') {
    expenses.push(entry);
  } else if (parsed.type === 'toPay') {
    entry.label = `Pay ${parsed.toWhom}`;
    toPay.push(entry);
  } else if (parsed.type === 'toGet') {
    entry.label = `Collect from ${parsed.fromWhom}`;
    toGet.push(entry);
  }

  // Update UI
  await saveData();
  renderAllLists();
  updateStats();

  // Sync with backend
  await backendService.saveTransaction(parsed);

  // Success feedback
  aiStatus.textContent = `✅ ${parsed.type} added: ₹${parsed.amount}`;
  aiStatus.className = 'status-active';

  setTimeout(() => {
    aiStatus.textContent = 'AI Mode ON 🔥 Ready for next entry!';
  }, 3000);
}

async function handleQueryResponse(geminiResponse) {
  const parsed = extractJSON(geminiResponse);

  if (!parsed) {
    throw new Error('Could not extract valid JSON from query response');
  }

  // Query backend for results
  const backendResponse = await backendService.queryData(parsed);

  // Display results in AI status or modal
  if (backendResponse) {
    const resultText = formatQueryResults(backendResponse, parsed);
    aiStatus.innerHTML = `📊 Query Results:<br>${resultText}`;
    aiStatus.className = 'status-active';
  } else {
    aiStatus.textContent = `📋 Query processed: ${JSON.stringify(parsed)}`;
    aiStatus.className = 'status-active';
  }
}

function formatQueryResults(results, query) {
  // Format backend results for display
  if (typeof results === 'object' && results.total !== undefined) {
    return `Total: ₹${results.total}`;
  } else if (Array.isArray(results)) {
    return `Found ${results.length} entries`;
  } else {
    return JSON.stringify(results, null, 2);
  }
}


async function syncEntryWithBackend(entry, type) {
  try {
    
    const backendData = {
      type: type === 'expenses' ? 'expense' : type.replace(/([A-Z])/g, '$1'),
      amount: entry.amount,
      category: entry.category || 'manual'
    };

    if (type === 'toPay') backendData.toWhom = entry.label;
    if (type === 'toGet') backendData.fromWhom = entry.label;

    const saved = await backendService.saveTransaction(backendData);
    entry._id = saved._id; // Store backend ID for future reference
    console.log('Entry synced with backend:', entry);
  } catch (error) {
    console.error('Backend sync error:', error);
  }
}

// Render functions (enhanced)
function renderList(list, container) {
  if (list.length === 0) {
    const emptyMessages = {
      'expenses-list': 'Click to add your first expense',
      'to-pay-list': 'No pending payments',
      'to-get-list': 'No money to collect'
    };
    container.innerHTML = `<div class="empty-state">${emptyMessages[container.id]}</div>`;
    return;
  }

  container.innerHTML = list.map(item => `
    <li>
      <div>
        <strong>${item.label}</strong> - ₹${item.amount}
        <br><small style="color: #888;">${item.date}</small>
        ${item.category && item.category !== 'manual' ? `<br><small style="color: #00ffcc;">📊 ${item.category}</small>` : ''}
      </div>
      <button class="delete-btn" onclick="deleteItem('${container.id.replace('-list', '')}', ${item.id})" title="Delete">×</button>
    </li>
  `).join('');
}

function renderAllLists() {
  renderList(expenses, expensesList);
  renderList(toPay, toPayList);
  renderList(toGet, toGetList);
}

async function deleteItem(type, id) {
  if (type === 'expenses') expenses = expenses.filter(item => item.id !== id);
  else if (type === 'to-pay') toPay = toPay.filter(item => item.id !== id);
  else if (type === 'to-get') toGet = toGet.filter(item => item.id !== id);

  await saveData();
  renderAllLists();
  updateStats();
}

// Stats calculation (enhanced)
function updateStats() {
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalToPay = toPay.reduce((sum, item) => sum + item.amount, 0);
  const totalToGet = toGet.reduce((sum, item) => sum + item.amount, 0);
  const netBalance = totalToGet - totalToPay;

  document.getElementById('total-expenses').textContent = `₹${totalExpenses.toFixed(2)}`;
  document.getElementById('total-to-pay').textContent = `₹${totalToPay.toFixed(2)}`;
  document.getElementById('total-to-get').textContent = `₹${totalToGet.toFixed(2)}`;

  const netElement = document.getElementById('net-balance');
  netElement.textContent = `₹${netBalance.toFixed(2)}`;
  netElement.style.color = netBalance >= 0 ? '#00ff88' : '#ff4444';
}

// Event listeners setup
function setupEventListeners() {
  // AI unlock functionality
  document.getElementById('unlock-ai').addEventListener('click', async () => {
    const key = document.getElementById('api-key').value.trim();
    if (key) {
      try {
        geminiService = new GeminiService(key);
        aiEnabled = true;
        aiFormContainer.style.display = 'block';
        aiStatus.textContent = 'AI Mode ON 🔥 Ready to parse your entries!';
        aiStatus.className = 'status-active';
      } catch (error) {
        alert('Invalid API key or connection error');
        console.error('AI initialization error:', error);
      }
    } else {
      alert('Please enter a valid API key');
    }
  });

  // AI form submission
  entryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = entryText.value.trim();
    if (!text) return;

    await processAIEntry(text);
    entryText.value = '';

    // Success feedback
    entryText.placeholder = 'Entry processed! 🎉 Add another...';
    setTimeout(() => {
      entryText.placeholder = "Drop your vibe like: 'Paid 400 for McD 🍔' or 'Owe 500 to John'";
    }, 2000);
  });

  // Modal controls
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// Make functions globally available
window.openModal = openModal;
window.closeModal = closeModal;
window.submitModal = submitModal;
window.deleteItem = deleteItem;

// Initialize the app
init();