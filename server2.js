const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Adjust to your frontend URL
    }
});

// Dummy database of logged-in users
let loggedInUsers = [
    { name: "Keerthika", email: "keerthikarg1@gmail.com" },
    { name: "John Doe", email: "john@example.com" }
];

// Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Notify all logged-in users when a new pet is reported
app.post("/report-lost-pet", async (req, res) => {
    try {
        const { petName, description, address } = req.body;

        // Emit notification to frontend
        io.emit("lostPetNotification", {
            message: `🚨 New Lost Pet Alert: ${petName}`,
            petName,
            description,
            address
        });

        // Send email to all logged-in users
        loggedInUsers.forEach(user => {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: `🚨 Lost Pet Alert: ${petName}`,
                text: `A new lost pet has been reported!\n\n🐶 Pet Name: ${petName}\n📍 Location: ${address}\n📝 Description: ${description}\n\nPlease check the website for more details.`
            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error(`❌ Email to ${user.email} failed:`, err);
                } else {
                    console.log(`📩 Email sent to ${user.email}:`, info.response);
                }
            });
        });

        res.status(201).json({ message: "✅ Lost pet reported & emails sent!" });
    } catch (error) {
        console.error("❌ Error reporting lost pet:", error);
        res.status(500).json({ error: "Error reporting lost pet." });
    }
});

server.listen(5000, () => {
    console.log("🚀 Server running on port 5000");
});
