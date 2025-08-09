const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb+srv://reon:reon23022006@ugatz.9dpmxqr.mongodb.net/?retryWrites=true&w=majority&appName=ugatz", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"));

const UserSchema = new mongoose.Schema({
    username: String,
    password: String
});
const User = mongoose.model("User", UserSchema);

const BookingSchema = new mongoose.Schema({
    username: String,
    date: String,
    seats: Number
});
const Booking = mongoose.model("Booking", BookingSchema);

const JWT_SECRET = "secretkey";

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.username = decoded.username;
        next();
    });
}

app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();
    res.json({ message: "User created successfully" });
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token, username: user.username });
});

app.post("/book", authMiddleware, async (req, res) => {
    const { date, seats } = req.body;

    if (!date || !seats) return res.status(400).json({ error: "Date and seats are required" });

    const booking = new Booking({ username: req.username, date, seats });
    await booking.save();
    res.json({ message: "Booking successful", booking });
});

app.get("/bookings", authMiddleware, async (req, res) => {
    const bookings = await Booking.find({ username: req.username });
    res.json(bookings);
});

app.delete("/cancel/:id", authMiddleware, async (req, res) => {
    const booking = await Booking.findOneAndDelete({ _id: req.params.id, username: req.username });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json({ message: "Booking cancelled" });
});

app.listen(5000, () => console.log("Server running on port 5000"));
