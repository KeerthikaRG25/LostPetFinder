const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors()); // Allow frontend requests
app.use(express.json()); // Middleware to parse JSON requests

// MongoDB Atlas Connection
const mongoURI = "mongodb+srv://Petilo:Petilo@cluster0.h6m89.mongodb.net/lost_pets?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected successfully"))
.catch((err) => console.error("MongoDB connection error:", err));

// Define Schema & Model
const PetSchema = new mongoose.Schema({
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    description: { type: String, required: true }
}, { collection: "pets" }); // Explicitly setting collection name

const Pet = mongoose.model("Pet", PetSchema);

// Root Route
app.get("/", (req, res) => {
    res.send("Welcome to the Lost Pet Finder API!");
});

// API endpoint to get lost pets
app.get("/api/pets", async (req, res) => {
    try {
        const pets = await Pet.find();
        res.json(pets);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// API endpoint to add a lost pet
app.post("/api/pets", async (req, res) => {
    try {
        const { name, latitude, longitude, description } = req.body;
        if (!name || !latitude || !longitude || !description) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const newPet = new Pet({ name, latitude, longitude, description });
        await newPet.save();
        res.status(201).json({ message: "Pet reported successfully", pet: newPet });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
