const express = require("express");
const app = express();
const cors = require("cors");
const receivable = require("./models/receivable");
const fs = require("fs");
const path = require("path");
const init_router = require('./routers/all')
app.use(cors());
app.use(express.json());
app.use(express.static("../public"));
const connectDB = require('./database/connection')

require('dotenv').config()
app.use('/v1/save', init_router);




PORT = 3000;
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(PORT, console.log(`The server is listening on port ${PORT}...`));
  } catch (err) {
    console.log(err);
  }
};

start();
