import Coupon from "../models/coupon.model.js";

export const getCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findOne({ userId: req.user._id, isActive: true });
        res.json(coupon || null);
    } catch (error) {
        console.error("Error fetching coupon:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const validateCoupon = async (req, res) => {
    const { code } = req.query;
    try {
        const { code } = req.body;
        const coupon = await Coupon.findOne({ code: code, userId: req.user._id, isActive: true });
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found or inactive" });
        }
        if (coupon.expirationDate < new Date()) {
            coupon.isActive = false;
            await coupon.save();
            return res.status(400).json({ message: "Coupon has expired" });
        }
        res.json({ 
            message:"Coupon is valid",
            code: coupon.code,
            discountPercentage: coupon.discountPercentage 
        });
    } catch (error) {
        console.error("Error validating coupon:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}