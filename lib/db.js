import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const databaseUrl = process.env.MONGODB_URI; // Fetch database URL from environment variables

mongoose.set('strictQuery', true); // Set the option to avoid deprecation warnings

// Connect to MongoDB using the URL from the environment variable
mongoose.connect(databaseUrl, {
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

export default mongoose.connection;
