const mongoose = require('mongoose');

const payableSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toWhom: { type: String, required: true },
  amount: { type: Number, required: true },
  reason: { type: String },
  dueDate: { type: Date },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' }
})