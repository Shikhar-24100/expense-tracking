const express = require("express");
const app = express();
const cors = require("cors");
const receivable = require("./models/receivable");
const fs = require("fs");
const path = require("path");

app.use(cors());
app.use(express.json());
app.use(express.static("../public"));
app.post("/v1/save", (req, res) => {
  console.log(req.body);
  const { type, amount, category, toWhom, fromWhom } = req.body;

  let dataToWrite = "";

  switch (type) {
    case "expense":
      dataToWrite = `Amount: ${amount}, Category: ${category}\n`;
      fs.appendFileSync(path.join(__dirname, "expense.txt"), dataToWrite);
      break;

    case "toPay":
      dataToWrite = `Amount: ${amount}, To: ${toWhom}\n`;
      fs.appendFileSync(path.join(__dirname, "payable.txt"), dataToWrite);
      break;

    case "toGet":
      dataToWrite = `Amount: ${amount}, From: ${fromWhom}\n`;
      fs.appendFileSync(path.join(__dirname, "receivable.txt"), dataToWrite);
      break;

    default:
      return res.status(400).json({ error: "Invalid type" });
  }

  return res.json({ success: true, savedTo: `${type}.txt` });
});

app.get("/v1/save1", (req, res) => {
  const { type, toWhom, fromWhom, category } = req.query;

  if (!type) {
    return res
      .status(400)
      .json({ error: "Missing required 'type' query parameter." });
  }

  let filePath = "";

  switch (type) {
    case "toPay":
      filePath = path.join(__dirname, "payable.txt");
      break;
    case "toGet":
      filePath = path.join(__dirname, "receivable.txt");
      break;
    case "expense":
      filePath = path.join(__dirname, "expense.txt");
      break;
    default:
      return res.status(400).json({ error: "Invalid type parameter." });
  }

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Failed to read file:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    const lines = data.trim().split("\n");
    let total = 0;

    if (type === "toPay") {
      for (let line of lines) {
        const match = line.match(/Amount:\s*(\d+),\s*To:\s*(.*)/i);
        if (match) {
          const amount = parseInt(match[1]);
          const person = match[2].trim().toLowerCase();
          if (person === toWhom?.toLowerCase()) {
            total += amount;
          }
        }
      }
      return res.status(200).json({
        type: "toPay",
        toWhom,
        amount: total,
      });
    }

    if (type === "toGet") {
      for (let line of lines) {
        const match = line.match(/Amount:\s*(\d+),\s*From:\s*(.*)/i);
        if (match) {
          const amount = parseInt(match[1]);
          const person = match[2].trim().toLowerCase();
          if (person === fromWhom?.toLowerCase()) {
            total += amount;
          }
        }
      }
      return res.status(200).json({
        type: "toGet",
        fromWhom,
        amount: total,
      });
    }

    if (type === "expense") {
      for (let line of lines) {
        const match = line.match(/Amount:\s*(\d+),\s*Category:\s*(.*)/i);
        if (match) {
          const amount = parseInt(match[1]);
          const cat = match[2].trim().toLowerCase();
          if (
            category?.toLowerCase() === "all" ||
            cat === category?.toLowerCase()
          ) {
            total += amount;
          }
        }
      }
      return res.status(200).json({
        type: "expense",
        category: category || "all",
        amount: total,
      });
    }
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
