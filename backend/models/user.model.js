import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    name: { type: String, required: [true, "Name is required"], },
    email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true, },
    password: { type: String, required: [true, "Password is required"], minlength: [6, "Password must be at least 6 characters long"], },
    cartItems: [{
        quantity: {
            type: Number,
            default: 1,
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
        }
    }],
    role: { type: String, enum: ["customer", "admin"], default: "customer", }
}, { timestamps: true }
);


// Pre-save hook to hash the password before saving the user to database
userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare the provided password with the hashed password in the database
// what is the purpose of this method? 
// This method is used to compare the password provided by the user during login with the hashed password stored in the database. It uses bcrypt's compare function to check if the passwords match, returning true if they do and false if they don't. This is essential for authenticating users securely without exposing their actual passwords.
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
}

const User = mongoose.model("User", userSchema);

export default User;