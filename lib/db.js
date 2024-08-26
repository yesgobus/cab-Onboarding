// Set up mongoose connection
const mongoose = require("mongoose");
require("dotenv").config();

const database_url = process.env.MONGODB_URI; // Fetch database URL from environment variables

mongoose.set('strictQuery', true); // Set the option to avoid deprecation warnings

// Connect to MongoDB using the URL from the environment variable
mongoose.connect(database_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log("Successfully connected to the database");
})
.catch((err) => {
    console.error("Could not connect to the database. Exiting now...", err);
    process.exit(1); // Exit with a failure code
});

module.exports = mongoose.connection;
