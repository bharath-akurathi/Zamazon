import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import Order from '../models/order.model.js';

export const salesAnalytics = async (req, res) => {
    try {
        const analyticsData = await getAnalyticsData();

        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

        const dailySalesData = await getDailySalesData(startDate, endDate);

        res.json({
            analyticsData,
            dailySalesData
        });

    } catch (error) {
        console.error("Error fetching sales analytics:", error);
        res.status(500).json({ message: "Failed to fetch sales analytics" });
    }
};

async function getAnalyticsData() {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments(); // added this by my own
    const salesData = await Order.aggregate([
        {
            $group: {
                _id: null, // it groups all documents together
                totalSales: { $sum: 1 }, // counts the number of orders
                totalRevenue: { $sum: "$totalAmount" }
            }
        }
    ]);

    const { totalSales, totalRevenue } = salesData[0] || { totalSales: 0, totalRevenue: 0 };

    return {
        users: totalUsers,
        products: totalProducts,
        orders: totalOrders,
        totalSales,
        totalRevenue,
    };
}

const getDailySalesData = async (startDate, endDate) => {
    try {
        const dailySales = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startDate, // greater than or equal to startDate
                        $lte: endDate // less than or equal to endDate
                    },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const dateArray = getDatesInRange(startDate, endDate);

        return dateArray.map(date => {
            const dailyData = dailySales.find(sale => sale._id === date);
            return {
                name: date,
                sales: dailyData ? dailyData.totalSales : 0,
                revenue: dailyData ? dailyData.totalRevenue : 0
            };
        });
    } catch (error) {
        console.error("Error fetching daily sales data:", error);
        throw error; // rethrow the error to be handled by the caller
    }
};

function getDatesInRange(startDate, endDate) {
    const dateArray = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        dateArray.push(currentDate.toISOString().split('T')[0]); // Format date as YYYY-MM-DD
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateArray;
}
