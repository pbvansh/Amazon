const { client } = require('../database/db');
const Stock = client.db('test').collection('stocks');

const getStock = async (productId) => {
    console.log(productId);
    const totalStock = await Stock.aggregate([
        {
            $match: {
                productId
            }
        },
        {
            $group: {
                _id: "$productId",
                stocks: {
                    $sum: "$stock"
                }
            }
        }
    ]).toArray();
    if (totalStock.length > 0) return totalStock[0].stocks;
    else return 0;
}


module.exports = {
    getStock,
}