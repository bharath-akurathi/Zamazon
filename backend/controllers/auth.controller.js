import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";

const generateTokens = (userId) => {
    const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" }); // Access token valid for 15 minutes
    const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" }); // Refresh token valid for 7 days
    return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
    try {
        await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60); // Store for 7 days
    } catch (error) {
        console.error("Error storing refresh token in Redis:", error);
    }
};

const setCookies = (res, accessToken, refreshToken) => {
    res.cookie("accessToken", accessToken, {
        httpOnly: true, // Prevents XSS (Cross Site Scripting) attacks by making the cookie inaccessible to client JavaScript
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict", // Prevents CSRF (Cross Site Request Forgery) attacks by not sending the cookie with cross-site requests
        maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

export const signup = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const user = await User.create({ name, email, password });

        //authentication logic can be added here (e.g., generating JWT token)

        const { accessToken, refreshToken } = generateTokens(user._id); // Generates JWT tokens

        await storeRefreshToken(user._id, refreshToken); // Store the refresh token in Redis

        setCookies(res, accessToken, refreshToken);

	        res.status(201).json({
	            user: {
	                _id: user._id,
	                name: user.name,
	                email: user.email,
	                role: user.role
	            },
	            message: "User registered successfully"
	        });
    } catch (error) {
        console.error("Error during signup:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const { accessToken, refreshToken } = generateTokens(user._id);

        await storeRefreshToken(user._id, refreshToken); // Store the refresh token in Redis

        setCookies(res, accessToken, refreshToken);

        res.json({
	            user: {
	                _id: user._id,
	                name: user.name,
	                email: user.email,
	                role: user.role
	            },
	            message: "Login successful"
	        });
    } catch (error) {
        console.error("Error during login:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token not found" });
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const userId = decoded.userId;

        // Remove the refresh token from Redis
        await redis.del(`refresh_token:${userId}`);

        // Clear the cookies
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        res.json({ message: "Logout successful" });
    } catch (error) {
        console.error("Error during logout:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token not found" });
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const userId = decoded.userId;

        // Check if the refresh token exists in Redis
        const storedRefreshToken = await redis.get(`refresh_token:${userId}`);
        if (storedRefreshToken !== refreshToken) {
            return res.status(400).json({ message: "Invalid refresh token" });
        }

        const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" }); // Access token valid for another 15 minutes

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 15 * 60 * 1000,
        });

        res.json({ message: "Token refreshed successfully" });
    } catch (error) {
        console.error("Error during token refresh:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getProfile = async (req, res) => {
    try {
        res.json(req.user);
    } catch (error) {
        console.error("Error fetching profile:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
