const mongoose = require("mongoose");

//function to establish the connection with a database
//this function is being invoked later in the main app before setting up the server
const connectDB = (url) => {
    //this function returns a promise
    return mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
};

module.exports = connectDB;
