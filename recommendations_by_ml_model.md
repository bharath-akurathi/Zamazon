# Recommendations By ML Model

This project currently recommends products by randomly sampling products from MongoDB:

```js
await Product.aggregate([
    { $sample: { size: 5 } },
    { $project: { _id: 1, name: 1, description: 1, price: 1, image: 1 } }
]);
```

That is not machine learning. It is only random selection.

Real recommendations usually start with simple data-driven rules, then move toward personalization, and finally toward ML or vector search when the app has enough product and user behavior data.

## 1. Products From The Same Category The User Viewed

This is a rule-based recommendation. No ML is needed.

The idea:

1. Track which products a user views.
2. Read the categories of recently viewed products.
3. Recommend other products from those same categories.
4. Exclude products the user already viewed or already has in cart.

Example event model:

```js
const productEventSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        index: true,
    },
    type: {
        type: String,
        enum: ["view", "cart_add", "purchase"],
        index: true,
    },
    category: {
        type: String,
        index: true,
    },
}, {
    timestamps: true,
});
```

When the user opens a product detail page, save a `view` event:

```js
await ProductEvent.create({
    user: req.user._id,
    product: product._id,
    type: "view",
    category: product.category,
});
```

Then recommend from recently viewed categories:

```js
const recentViews = await ProductEvent.find({
    user: req.user._id,
    type: "view",
})
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

const categories = [...new Set(recentViews.map((event) => event.category))];
const viewedProductIds = recentViews.map((event) => event.product);

const recommendations = await Product.find({
    category: { $in: categories },
    _id: { $nin: viewedProductIds },
})
    .limit(5)
    .lean();
```

This gives recommendations like:

> User viewed shoes, so show more shoes.

It is simple, fast, and useful for a small ecommerce app.

## 2. Products Similar To Items In Cart

This is also rule-based at first.

Your `User` model already has `cartItems`, so you can use those products as the signal.

The idea:

1. Load the user's cart products.
2. Read their categories.
3. Optionally read price ranges, names, and descriptions.
4. Recommend products from matching categories.
5. Exclude products already in the cart.

Example:

```js
const user = await User.findById(req.user._id)
    .populate("cartItems.product")
    .lean();

const cartProducts = user.cartItems.map((item) => item.product);
const cartProductIds = cartProducts.map((product) => product._id);
const cartCategories = [...new Set(cartProducts.map((product) => product.category))];

const recommendations = await Product.find({
    category: { $in: cartCategories },
    _id: { $nin: cartProductIds },
})
    .limit(5)
    .lean();
```

You can improve this by matching price range:

```js
const prices = cartProducts.map((product) => product.price);
const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

const recommendations = await Product.find({
    category: { $in: cartCategories },
    _id: { $nin: cartProductIds },
    price: {
        $gte: averagePrice * 0.5,
        $lte: averagePrice * 1.5,
    },
})
    .limit(5)
    .lean();
```

This gives recommendations like:

> User has running shoes in cart, so show related shoes in a similar price range.

## 3. Bestsellers

Bestsellers need order or purchase data.

If you do not store successful orders yet, you cannot know real bestsellers. You can only fake it with fields like `isFeatured`.

Example order model:

```js
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },
    products: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
            },
            quantity: {
                type: Number,
                default: 1,
            },
            price: Number,
        },
    ],
    status: {
        type: String,
        enum: ["pending", "paid", "cancelled", "refunded"],
        default: "pending",
        index: true,
    },
    paidAt: Date,
}, {
    timestamps: true,
});
```

Aggregation for bestsellers:

```js
const bestsellers = await Order.aggregate([
    { $match: { status: "paid" } },
    { $unwind: "$products" },
    {
        $group: {
            _id: "$products.product",
            totalSold: { $sum: "$products.quantity" },
        },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
    {
        $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
        },
    },
    { $unwind: "$product" },
    {
        $project: {
            _id: "$product._id",
            name: "$product.name",
            description: "$product.description",
            price: "$product.price",
            image: "$product.image",
            category: "$product.category",
            totalSold: 1,
        },
    },
]);
```

This gives recommendations like:

> These are the products most people are buying.

## 4. Recently Popular Products

Recently popular products are based on recent activity, not all-time sales.

You can use the same `ProductEvent` collection from the category example.

The idea:

1. Track events like `view`, `cart_add`, and `purchase`.
2. Give stronger events more weight.
3. Only look at recent events, like the last 7 days.
4. Sort products by weighted score.

Example weights:

```js
const eventWeights = {
    view: 1,
    cart_add: 3,
    purchase: 5,
};
```

MongoDB aggregation:

```js
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const recentlyPopular = await ProductEvent.aggregate([
    {
        $match: {
            createdAt: { $gte: sevenDaysAgo },
            type: { $in: ["view", "cart_add", "purchase"] },
        },
    },
    {
        $addFields: {
            weight: {
                $switch: {
                    branches: [
                        { case: { $eq: ["$type", "purchase"] }, then: 5 },
                        { case: { $eq: ["$type", "cart_add"] }, then: 3 },
                        { case: { $eq: ["$type", "view"] }, then: 1 },
                    ],
                    default: 0,
                },
            },
        },
    },
    {
        $group: {
            _id: "$product",
            popularityScore: { $sum: "$weight" },
        },
    },
    { $sort: { popularityScore: -1 } },
    { $limit: 5 },
]);
```

Then fetch the matching products:

```js
const productIds = recentlyPopular.map((item) => item._id);

const products = await Product.find({
    _id: { $in: productIds },
}).lean();
```

This gives recommendations like:

> These products are getting attention right now.

In production, this is a good candidate for Redis caching because the same popular list can be reused for many users.

## 5. Personalized Recommendations From Purchase And View History

This is where recommendations start to feel personal.

The idea:

1. Track user views, cart additions, and purchases.
2. Build a preference profile for each user.
3. Score products based on how well they match that user's behavior.
4. Exclude products they already bought or recently viewed.

Simple scoring example:

```txt
purchase in category = +5
cart add in category = +3
view in category = +1
```

If a user views shoes 6 times, adds 1 shoe to cart, and buys 1 shoe:

```txt
shoe score = 6 views * 1 + 1 cart_add * 3 + 1 purchase * 5
shoe score = 14
```

Then recommend more products from the user's highest scoring categories.

Example aggregation to find a user's favorite categories:

```js
const userCategoryScores = await ProductEvent.aggregate([
    {
        $match: {
            user: req.user._id,
            type: { $in: ["view", "cart_add", "purchase"] },
        },
    },
    {
        $addFields: {
            weight: {
                $switch: {
                    branches: [
                        { case: { $eq: ["$type", "purchase"] }, then: 5 },
                        { case: { $eq: ["$type", "cart_add"] }, then: 3 },
                        { case: { $eq: ["$type", "view"] }, then: 1 },
                    ],
                    default: 0,
                },
            },
        },
    },
    {
        $group: {
            _id: "$category",
            score: { $sum: "$weight" },
        },
    },
    { $sort: { score: -1 } },
    { $limit: 3 },
]);
```

Then recommend products from those categories:

```js
const topCategories = userCategoryScores.map((item) => item._id);

const recommendations = await Product.find({
    category: { $in: topCategories },
})
    .limit(10)
    .lean();
```

This is still not ML. It is personalized scoring. For many ecommerce apps, this is already good enough.

A more advanced non-ML version is collaborative filtering:

```txt
Users who bought product A also bought product B.
Users who viewed product X also viewed product Y.
```

That requires comparing behavior across many users.

## 6. ML Or Vector Search Based Recommender

This is the closest version to a real ML-based recommendation system.

Instead of only matching exact categories, you convert products into vectors, also called embeddings. An embedding is a list of numbers that represents meaning.

For example, these products may be close in vector space:

```txt
Nike running shoe
Adidas jogging sneaker
Lightweight marathon trainer
```

Even if the words are not exactly the same, the model understands that they are semantically similar.

### Product Embeddings

Create searchable text for each product:

```js
const productText = `
Name: ${product.name}
Description: ${product.description}
Category: ${product.category}
Price: ${product.price}
`;
```

Send that text to an embedding model. The result is an array of numbers:

```js
product.embedding = [0.012, -0.203, 0.887, ...];
```

Store the embedding on the product:

```js
const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    image: String,
    category: String,
    isFeatured: Boolean,
    embedding: [Number],
}, {
    timestamps: true,
});
```

### User Embeddings

To personalize recommendations, create a user vector from the products they interacted with.

Examples:

1. Average the embeddings of products in the user's cart.
2. Average the embeddings of products the user viewed recently.
3. Give purchases more weight than views.

Simple idea:

```txt
userVector =
    viewedProductEmbedding * 1
    + cartProductEmbedding * 3
    + purchasedProductEmbedding * 5
```

Then search for products whose embeddings are closest to `userVector`.

### Vector Database Options

Common choices:

1. MongoDB Atlas Vector Search
2. Pinecone
3. Qdrant
4. Weaviate
5. PostgreSQL with pgvector
6. Redis vector search

Since this project already uses MongoDB and Mongoose, MongoDB Atlas Vector Search would be the most natural first option if you are using Atlas.

Pseudo example with MongoDB vector search:

```js
const recommendations = await Product.aggregate([
    {
        $vectorSearch: {
            index: "product_vector_index",
            path: "embedding",
            queryVector: userVector,
            numCandidates: 100,
            limit: 10,
        },
    },
    {
        $project: {
            _id: 1,
            name: 1,
            description: 1,
            price: 1,
            image: 1,
            category: 1,
            score: { $meta: "vectorSearchScore" },
        },
    },
]);
```

This gives recommendations like:

> User likes lightweight running products, so show semantically similar products even across slightly different categories.

## Recommended Path For This Project

A practical path would be:

1. Keep the current random recommendation endpoint as a fallback.
2. Add a `ProductEvent` model to track `view`, `cart_add`, and `purchase`.
3. Build recently popular products using weighted events.
4. Build same-category recommendations from recently viewed products.
5. Build cart-based recommendations using `User.cartItems`.
6. Add an `Order` model if the app has checkout, then build bestsellers.
7. Add personalized scoring from user history.
8. Add embeddings and vector search when you have enough products and user behavior data.

## Suggested API Endpoints

```txt
GET /api/products/recommendations/random
GET /api/products/recommendations/category-history
GET /api/products/recommendations/cart
GET /api/products/recommendations/bestsellers
GET /api/products/recommendations/recently-popular
GET /api/products/recommendations/personalized
GET /api/products/recommendations/vector
```

For a small project, you can also keep one endpoint:

```txt
GET /api/products/recommendations
```

And decide the strategy inside the controller:

```txt
if user has cart items:
    recommend from cart
else if user has recent views:
    recommend from viewed categories
else if popular products exist:
    recommend recently popular
else:
    return random products
```

## Main Takeaway

Mongoose does not automatically recommend products and MongoDB does not secretly run an ML model for `$sample`.

The recommendation quality comes from the data and logic you add:

1. Category matching gives simple related products.
2. Cart matching gives intent-based products.
3. Order aggregation gives bestsellers.
4. Event tracking gives recently popular products.
5. User history gives personalization.
6. Embeddings and vector search give ML-style semantic similarity.

