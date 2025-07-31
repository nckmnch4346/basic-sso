const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
	cors({
		origin: [
			"http://localhost:3000",
			"http://localhost:5500",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:5500",
			"https://nmenchero.wmdd4950.com",
			"http://nmenchero.wmdd4950.com",
		],
		credentials: true,
	})
);
app.use(express.json());
app.use(express.static("public"));

// MongoDB connection
mongoose.connect(
	process.env.MONGODB_URI,
	{
		useNewUrlParser: true,
		useUnifiedTopology: true,
	}
);

// User Schema
const userSchema = new mongoose.Schema({
	googleId: { type: String, required: true, unique: true },
	email: { type: String, required: true, unique: true },
	name: { type: String, required: true },
	picture: { type: String },
	createdAt: { type: Date, default: Date.now },
	lastLogin: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

// Google OAuth2 Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// JWT Secret
const JWT_SECRET =
	process.env.JWT_SECRET;

// Middleware to verify JWT
const authenticateToken = async (req, res, next) => {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (!token) {
		return res.status(401).json({ error: "Access token required" });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		const user = await User.findById(decoded.userId);
		if (!user) {
			return res.status(401).json({ error: "Invalid token" });
		}
		req.user = user;
		next();
	} catch (error) {
		return res.status(403).json({ error: "Invalid or expired token" });
	}
};

// Route to provide client ID to frontend
app.get("/config", (req, res) => {
	res.json({
		googleClientId: process.env.GOOGLE_CLIENT_ID,
	});
});

// Routes
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dashboard", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Google OAuth2 verification endpoint
app.post("/auth/google", async (req, res) => {
	try {
		const { token } = req.body;

		// Verify the Google token
		const ticket = await client.verifyIdToken({
			idToken: token,
			audience: process.env.GOOGLE_CLIENT_ID,
		});

		const payload = ticket.getPayload();
		const { sub: googleId, email, name, picture } = payload;

		// Find or create user
		let user = await User.findOne({ googleId });

		if (!user) {
			user = new User({
				googleId,
				email,
				name,
				picture,
			});
			await user.save();
		} else {
			// Update last login
			user.lastLogin = new Date();
			await user.save();
		}

		// Generate JWT
		const jwtToken = jwt.sign(
			{ userId: user._id, email: user.email },
			JWT_SECRET,
			{ expiresIn: "24h" }
		);

		res.json({
			success: true,
			token: jwtToken,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				picture: user.picture,
			},
		});
	} catch (error) {
		console.error("Auth error:", error);
		res.status(401).json({ error: "Invalid Google token" });
	}
});

// Protected route to get user data
app.get("/api/user", authenticateToken, (req, res) => {
	res.json({
		user: {
			id: req.user._id,
			name: req.user.name,
			email: req.user.email,
			picture: req.user.picture,
			createdAt: req.user.createdAt,
			lastLogin: req.user.lastLogin,
		},
	});
});

// Logout endpoint
app.post("/api/logout", authenticateToken, (req, res) => {
	res.json({ success: true, message: "Logged out successfully" });
});

// Start server
app.listen(PORT, () => {
	console.log(`Server running on ${PORT}`);
});

module.exports = app;
