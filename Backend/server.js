const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Mount route modules
const spotsRoute = require("./routes/spots");
const itineraryRoute = require("./routes/itinerary");
const eventsRoute = require("./routes/events");
const aiRoute = require("./routes/ai");
const adminRoute = require("./routes/admin");
const scraperRoute = require("./routes/scraper");
const uploadsRoute = require("./routes/uploads");
const advisoriesRoute = require("./routes/advisories");
app.use("/api/spots", spotsRoute);
app.use("/api/itinerary", itineraryRoute);
app.use("/api/events", eventsRoute);
app.use("/api/ai", aiRoute);
app.use("/api/admin", adminRoute);
app.use("/api/scraper", scraperRoute);
app.use("/api/uploads", uploadsRoute);
app.use("/api/advisories", advisoriesRoute);

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection failed:", err.message));

// Health check
app.get("/", (req, res) => res.send("Alaffia API running"));

// 404 catch-all — must be registered last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
