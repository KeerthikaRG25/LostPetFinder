const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app); // Create an HTTP server
const io = new Server(server, {
    cors: { origin: "*" } // Allow all origins
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose.connect("mongodb+srv://Petilo:petilo@cluster0.h6m89.mongodb.net/lost_pets", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Pet Schema & Model
const petSchema = new mongoose.Schema({
    petName: String,
    email: String,
    contact: String,
    password: String,
    image: String,
    description: String,
    address: String,
    latitude: Number,
    longitude: Number,
    createdAt: { type: Date, default: Date.now }
});
const Pet = mongoose.model("Pet", petSchema);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Storage Setup for Image Uploads
const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// WebSocket Connection
io.on("connection", (socket) => {
    console.log("🔗 A user connected");

    socket.on("disconnect", () => {
        console.log("❌ A user disconnected");
    });
});

// Route to Handle Lost Pet Submission
app.post("/report-lost-pet", upload.single("petImage"), async (req, res) => {
    try {
        const { petName, email, contact, password, description, address, latitude, longitude } = req.body;
        if (!petName || !email || !contact || !password || !description || !address || !latitude || !longitude) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const imagePath = req.file ? `/uploads/${req.file.filename}` : "";
        const newPet = new Pet({ petName, email, contact, password, description, address, latitude, longitude, image: imagePath });

        await newPet.save();
        res.status(201).json({ message: "✅ Lost pet reported successfully!", pet: newPet });

        // Broadcast event to all users
        io.emit("newLostPet", { petName, address });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "❌ Error reporting lost pet." });
    }
});

// Start Server
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
