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

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
