"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.json({ message: "MoodMap backend running 🚀" });
});
const places_1 = __importDefault(require("./routes/places"));
const user_1 = __importDefault(require("./routes/user"));
const mood_1 = __importDefault(require("./routes/mood"));
const locations_1 = __importDefault(require("./routes/locations"));
const chatbot_1 = __importDefault(require("./routes/chatbot"));
app.use("/api/places", places_1.default);
app.use("/api/user", user_1.default);
app.use("/api/mood", mood_1.default);
app.use("/api/locations", locations_1.default);
app.use("/api/chatbot", chatbot_1.default);
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
