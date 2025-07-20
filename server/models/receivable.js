const mongoose = require('mongoose');

const receivableSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromWhom: { type: String, required: true },
  amount: { type: Number, required: true },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'received'], default: 'pending' }
});

module.exports = mongoose.model('Receivable', receivableSchema);
