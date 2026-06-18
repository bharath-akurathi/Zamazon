import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: { type: String, required: [true, "Product name is required"], },
    description: { type: String, required: [true, "Product description is required"], },
    price: { type: Number, required: [true, "Product price is required"], min: [0, "Price cannot be negative"], },
    image: { type: String, required: [true, "Product image URL is required"], },
    category: { type: String, required: [true, "Product category is required"], },
    isFeatured: { type: Boolean, default: false, }
}, { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;

// example 
//     "name" : "Nike Downshifter 12",
//     "description" : "Latest running shoes from Nike",
//     "price": 30,
//     "image":"https://unsplash.com/photos/black-and-white-nike-athletic-shoes-on-brown-sand-xag0YpBqNfQ",
//     "category" : "shoes",
//     "isFeatured" : true