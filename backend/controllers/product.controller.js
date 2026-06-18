import Product from "../models/product.model.js";
import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";

export const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find({}); // Fetch all products from the database
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error.message);
        res.status(500).json({ message: "Server error" });
    }
}

export const getFeaturedProducts = async (req, res) => {
    try {
        // first check if the featured products are cached in Redis
        // next if they are cached, return the cached data
        // if not cached, fetch from MongoDB, cache the result in Redis, and return the data
        const cachedFeaturedProducts = await redis.get("featured_products");
        if (cachedFeaturedProducts) {
            return res.json(JSON.parse(cachedFeaturedProducts));
        }
        // Use .lean() to get plain JavaScript objects instead of Mongoose documents 
        // which is more efficient for faster read-only operations
        const FeaturedProducts = await Product.find({ isFeatured: true }).lean();
        if (!FeaturedProducts) {
            return res.status(404).json({ message: "No featured products found" });
        }

        await redis.set("featured_products", JSON.stringify(FeaturedProducts));
        res.json(FeaturedProducts);
    } catch (error) {
        console.error("Error fetching featured products:", error.message);
        res.status(500).json({ message: "Server error" });
    }
}

export const createProduct = async (req, res) => {
    try {
        const { name, description, price, image, category } = req.body;
        if (!name || !description || !price || !category) {
            return res.status(400).json({ message: "All fields are required" });
        }
        let cloudinaryResponse = null;
        if (image) {
            cloudinaryResponse = await cloudinary.uploader.upload(image, {
                folder: "products",
                // transformation: [
                //     { width: 500, height: 500, crop: "fill" }
                // ]
            });
        }
        const newProduct = await Product.create({
            name,
            description,
            price,
            category,
            image: cloudinaryResponse ? cloudinaryResponse.secure_url : "",
        });
        res.status(201).json(newProduct);
    } catch (error) {
        console.error("Error creating product:", error.message);
        res.status(500).json({ message: "Server error" });
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        if(product.image) {
            try{
                // Extract public ID from the image URL assuming the URL structure is consistent with Cloudinary's format
                const publicId = product.image.split("/").pop().split(".")[0]; 
                await cloudinary.uploader.destroy(`products/${publicId}`);
            } catch (error) {
                console.error("Error deleting image from cloudinary", error.message);
            }
        }
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product deleted successfully" });

    } catch (error) {
        console.error("Error deleting product:", error.message);
        res.status(500).json({ message: "Server error" });
    }
}

// randomly recommend 5 products to the user
export const getRecommendedProducts = async (req, res) => {
    try {
        const recommendedProducts = await Product.aggregate([
            // Randomly select 5 products for recommendation
            { $sample: { size: 5 } },
            // Project only necessary fields 
            // (here 1 means include the field, 0 would mean exclude)
            { $project: { _id:1, name: 1, description: 1, price: 1, image: 1} } 
        ]);
        res.json(recommendedProducts);
    } catch (error) {
        console.error("Error fetching recommended products:", error.message);
        res.status(500).json({ message: "Server error" });
    }
}

export const getProductsByCategory = async (req, res) => {
    try {
        const category = req.params.category;
        const products = await Product.find({ category: category });
        if (products.length === 0) {
            return res.status(404).json({ message: "No products found in this category" });
        }
        res.json({products});
    } catch (error) {
        console.error("Error fetching products by category:", error.message);
        res.status(500).json({ message: "Server error" });
    }
}


export const toggleFeaturedProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        product.isFeatured = !product.isFeatured;
        const updatedProduct = await product.save();
        // Update the Redis cache after toggling featured status
        await updateFeaturedProductsCache(); 
        res.json(updatedProduct);
    } catch (error) {
        console.error("Error toggling featured status:", error.message);
        res.status(500).json({ message: "Server error" });
    }
}   

const updateFeaturedProductsCache = async () => {
    try {
        const featuredProducts = await Product.find({ isFeatured: true }).lean();
        await redis.set("featured_products", JSON.stringify(featuredProducts));
    } catch (error) {
        console.error("Error updating featured products cache:", error.message);
    }
}