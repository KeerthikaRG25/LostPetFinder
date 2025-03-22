require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));
    //transporter
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,  // Your Gmail address
            pass: process.env.EMAIL_PASS,  // App password (not your Gmail password)
        },
    });
    console.log(process.env.EMAIL_USER,process.env.EMAIL_PASS);
    

// Pet Schema
const PetSchema = new mongoose.Schema({
    petName: String,
    email: String,
    contact: String,
    description: String,
    address: String,
    lat: Number,
    lng: Number,
    image: String,
    type: String, // "lost" or "found"
    createdAt: { type: Date, default: Date.now }
});

const Pet = mongoose.model("Pet", PetSchema);

// User Schema for tracking logged-in users
const UserSchema = new mongoose.Schema({
    email: String,
    socketId: String,
    isLoggedIn: { type: Boolean, default: false }
});

const User = mongoose.model("User", UserSchema);

// WebSocket Connection
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user-logged-in", async (email) => {
        await User.findOneAndUpdate({ email }, { socketId: socket.id, isLoggedIn: true }, { upsert: true });
        console.log(`User logged in: ${email}`);
    });

    socket.on("disconnect", async () => {
        console.log("User disconnected:", socket.id);
        await User.findOneAndUpdate({ socketId: socket.id }, { isLoggedIn: false });
    });
});

// Function to send email notifications
async function sendEmailNotification(petName, type) {
    const loggedInUsers = await User.find({ isLoggedIn: true });
     // Add this console.log to check users before sending emails
     console.log("Logged-in users:", loggedInUsers);

    if (loggedInUsers.length === 0) return;

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: loggedInUsers.map(user => user.email).join(","),
        subject: `New ${type} Pet Reported: ${petName}`,
        text: `A ${type} pet named ${petName} has been reported. Check the platform for more details.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email notifications sent.");
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

// Handle Pet Report Submission
app.post("/report-pet", async (req, res) => {
    try {
        const { petName, email, contact, description, address, lat, lng, image, type } = req.body;

        const newPet = new Pet({ petName, email, contact, description, address, lat, lng, image, type });
        await newPet.save();
        console.log(loggedInUsers);

        // Send email notification
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,  // Send to the reporter's email
            subject: `Lost Pet Report: ${petName}`,
            html: `<p>A new ${type} pet has been reported.</p>
                   <p><strong>Pet Name:</strong> ${petName}</p>
                   <p><strong>Description:</strong> ${description}</p>
                   <p><strong>Contact:</strong> ${contact}</p>
                   <p><strong>Location:</strong> ${address}</p>
                   <p><img src="${image}" alt="Pet Image" width="200"/></p>`,
        };

      

        // Notify all connected users via WebSocket
        io.emit("new-pet-report", { message: `A ${type} pet has been reported!`, petName, type });

        res.status(201).json({ message: "Pet reported successfully" });
    } catch (error) {
        res.status(500).json({ error: "Something went wrong" });
    }
});


// Start the Server
server.listen(5000, () => console.log("Server running on port 5000"));
