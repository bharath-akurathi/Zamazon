import jwt from "jsonwebtoken";
import User  from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;
        if (!accessToken) {
            return res.status(401).json({ message: "No access token - Unauthorized" });
        }
        try {
            const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
            const user = await User.findById(decoded.userId).select("-password");
            if (!user) {
                return res.status(401).json({ message: "Unauthorized - User not found" });
            }
            req.user = user; // Attach user information to the request object

            next();
            
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({ message: "Unauthorized - Access token expired" });
            }
            throw error; // Rethrow the error to be caught by the outer catch block
        }
    } catch (error) {
        console.error("Error in protectRoute middleware:", error.message);
        res.status(401).json({ message: "Unauthorized" });
    }
};

export const adminRoute = (req, res, next) => {
    if(req.user.role === "admin") {
        next();
    } else {
        res.status(403).json({ message: "Access denied - Admins only" });
    }
};