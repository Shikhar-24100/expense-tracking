const Expense = require("../models/expenses");
const Payable = require("../models/payable");
const Receivable = require("../models/receivable");

exports.saveData = async (req, res) => {
  const { type, amount, category, toWhom, fromWhom } = req.body;

  try {
    switch (type) {
      case "expense":{
        const newEntry = await Expense.create({ amount, category });
        return res.json(newEntry);
      }
      case "toPay": {
        const newEntry = await Payable.create({ amount, toWhom });
        return res.json(newEntry);
      }
      case "toGet":{
        const newEntry = await Receivable.create({ amount, fromWhom });
        return res.json(newEntry);
      }   
      default:
        return res.status(400).json({ error: "Invalid type" });
    }
  } catch (err) {
    console.error("MongoDB error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getData = async (req, res) => {
  const { type, toWhom, fromWhom, category } = req.query;

  try {
    let total = 0;

    if (type === "toPay" && toWhom) {
      const results = await Payable.find({ toWhom: new RegExp(`^${toWhom}$`, "i") });
      total = results.reduce((sum, item) => sum + item.amount, 0);
      return res.json({ type, toWhom, amount: total });
    }

    if (type === "toGet" && fromWhom) {
      const results = await Receivable.find({ fromWhom: new RegExp(`^${fromWhom}$`, "i") });
      total = results.reduce((sum, item) => sum + item.amount, 0);
      return res.json({ type, fromWhom, amount: total });
    }

    if (type === "expense") {
      const filter = category?.toLowerCase() === "all" || !category
        ? {}
        : { category: new RegExp(`^${category}$`, "i") };

      const results = await Expense.find(filter);
      total = results.reduce((sum, item) => sum + item.amount, 0);
      return res.json({ type, category: category || "all", amount: total });
    }

    return res.status(400).json({ error: "Invalid or missing parameters." });
  } catch (err) {
    console.error("MongoDB error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
