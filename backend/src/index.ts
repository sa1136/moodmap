import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "MoodMap backend running 🚀" });
});

// Import routes
import placesRouter from "./routes/places";
import userRouter from "./routes/user";
import moodRouter from "./routes/mood";

app.use("/api/places", placesRouter);
app.use("/api/user", userRouter);
app.use("/api/mood", moodRouter);

const PORT = process.env.PORT || 5001; // change from 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

