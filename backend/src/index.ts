import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import placesRouter from "./routes/places";
import userRouter from "./routes/user";
import moodRouter from "./routes/mood";
import locationsRouter from "./routes/locations";
import chatbotRouter from "./routes/chatbot";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "MoodMap backend running 🚀" });
});

app.use("/api/places", placesRouter);
app.use("/api/user", userRouter);
app.use("/api/mood", moodRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/chatbot", chatbotRouter);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

