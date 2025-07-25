const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  // userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  category: { type: String, default: 'uncategorized' },
  // reason: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', expenseSchema);
