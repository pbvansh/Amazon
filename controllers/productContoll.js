const { ObjectId } = require('mongodb');
const { client } = require('../database/db');
const { sendMsg } = require('../utils/msg');
const Product = client.db('test').collection('products')
const Review = client.db('test').collection('reviews')
const Stock = client.db('test').collection('stocks');

const getSellerProducts = async (ctx) => {
    const companyId = ctx.user.companyId;
    const { sort, filter, skip, noOfDoc } = ctx.allFilters;
    const products = await Product.aggregate([
        {
            $match: { companyId }
        },
        {
            $lookup: {
                from: 'stocks',
                localField: '_id',
                foreignField: 'productId',
                as: "productStocks"
            }
        }, {
            $unwind: {
                path: "$productStocks",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'reviews',
                localField: '_id',
                foreignField: 'productId',
                as: "review"
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                price: 1,
                image: 1,
                desc: 1,
                isDeleted: 1,
                totalReviews: {
                    $size: "$review"
                },
                totalStocks: { $sum: "$productStocks.stockAt.stocks" },
            }
        },
        {
            $match: { ...filter } || {}
        },
        {
            $sort: Object.keys(sort).length === 0 ? { _id: -1 } : sort
        },
        {
            $skip: skip
        }, {
            $limit: noOfDoc
        }
    ]).toArray()
    ctx.body = products;
}
const getAllProducts = async (ctx) => {
    const { sort, filter, skip, noOfDoc } = ctx.allFilters;
    const products = await Product.aggregate([
        {
            $match: { isDeleted: false }
        },
        {
            $lookup: {
                from: 'users',
                let: { id: "$companyId" },
                pipeline: [
                    {
                        $match: { $expr: { $eq: ["$_id", "$$id"] } }
                    }, {
                        $project: {
                            userName: 1
                        }
                    }
                ],
                as: 'company'
            }
        },
        {
            $unwind: {
                path: '$company',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                price: 1,
                image: 1,
                desc: 1,
                company: "$company.userName"
            }
        },
        {
            $match: { ...filter } || {}
        },
        {
            $sort: Object.keys(sort).length === 0 ? { _id: -1 } : sort
        },
        {
            $skip: skip
        }, {
            $limit: noOfDoc
        }
    ]).toArray()
    ctx.body = products;
}

const getSingleProduct = async (ctx) => {
    console.log('hiii');
    const { productId } = new ObjectId(ctx.request.params.id);
    const product = await Product.aggregate([
        {
            $match: { productId }
        },
        {
            $lookup: {
                from: "users",
                let: { id: "$companyId" },
                pipeline: [
                    {
                        $match: { $expr: { $eq: ["$_id", "$$id"] } }
                    }, {
                        $project: {
                            email: 1,
                            userName: 1
                        }
                    }
                ],
                as: "seller"
            }
        }, {
            $unwind: "$seller"
        },
        {
            $lookup: {
                from: "stocks",
                localField: "_id",
                foreignField: "productId",
                as: "stocks"
            }
        },
        {
            $unwind: {
                path: "$stocks",
                preserveNullAndEmptyArrays: true
            }
        }, 
        // {
        //     $project: {
        //         stocks: "$stocks.stockAt"
        //     }
        // },
        {
            $lookup: {
                from: "reviews",
                localField: "_id",
                foreignField: "productId",
                as: "reviews"
            }
        }, {
            $lookup: {
                from: "users",
                let: { reviewArray: "$reviews" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $in: ["$_id", "$$reviewArray.userId"]
                            }
                        }
                    }, {
                        $addFields: { reviewinfo: { $arrayElemAt: ["$$reviewArray", { $indexOfArray: ["$$reviewArray.userId", "$_id"] }] } }
                    }, {
                        $project: { userName: 1, email: 1, review: "$reviewinfo.review", rating: "$reviewinfo.rating" }
                    }
                ],
                as: "userReviews"
            }
        },
        {
            $project: {
                // sellerInfo: { $addFields: "$seller" },
                reviews: 0,
                "seller.password": 0,
            }
        }
    ]).toArray();
    ctx.body = product;
}

const addProduct = async (ctx) => {
    const { bodyData } = ctx.state;
    // console.log(ctx.user);
    bodyData.companyId = ctx.user.companyId;
    bodyData.isDeleted = false
    await Product.insertOne(bodyData)
    sendMsg(ctx, 201, 'Product add successfully')
}

const updateProduct = async (ctx) => {
    const productId = new ObjectId(ctx.request.params.id)
    const { bodyData } = ctx.state;
    bodyData.companyId = ctx.user.companyId;
    // bodyData.isDeleted = false
    const updateCount = await Product.updateOne({ _id: productId }, { $set: bodyData })
    // console.log(updateCount);
    updateCount.modifiedCount > 0 ? sendMsg(ctx, 200, 'Product updated successfully')
        : sendMsg(ctx, 400, 'product is not available')
}

const deleteProduct = async (ctx) => {
    const productId = new ObjectId(ctx.request.params.id)
    const deleteCount = await Product.updateOne({ _id: productId }, { $set: { isDeleted: true } })
    deleteCount.modifiedCount > 0 ? sendMsg(ctx, 200, 'Product deleted successfully')
        : sendMsg(ctx, 400, 'product is not available')

}

const addReviews = async (ctx) => {
    const { review, rating, productId } = ctx.request.body;
    await Review.insertOne({
        productId,
        userId: ctx.user._id,
        review,
        rating,
        createdAt: new Date()
    })
    sendMsg(ctx, 200, 'Thank you for your review');
}

const getProductReview = async (ctx) => {
    const productId = new ObjectId(ctx.request.params.id);
    const product = await Review.aggregate([
        {
            $match: {
                productId
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: "user"
            }
        },
        {
            $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                review: 1,
                rating: 1,
                userName: '$user.userName',
                email: '$user.email',
                createdAt: 1,
            }
        }
    ]).toArray();
    ctx.body = product;
}

const addStock = async (ctx) => {
    const { stockAt, productId } = ctx.request.body;
    for (const oneStock of stockAt) {
        const isExist = await Stock.countDocuments({ productId, "stockAt.place": oneStock.place })
        if (isExist > 0) {
            await Stock.updateOne({ productId, "stockAt.place": oneStock.place },
                {
                    $inc: { "stockAt.$.stocks": oneStock.stocks }
                }
            );
        } else {
            await Stock.updateOne({ productId }, {
                $push: { "stockAt": oneStock }
            }, { upsert: true })
        }
    }
    sendMsg(ctx, 201, 'stock added successfully')
}

const getStock = async (ctx) => {
    try {
        const { id } = ctx.request.params;
        const stocks = await Stock.aggregate([
            {
                $match: {
                    productId: new ObjectId(id)
                }
            },
            {
                $addFields: { totalStocks: { $sum: "$stockAt.stocks" } }
            }
        ]).toArray()
        // console.log(stocks);
        ctx.body = stocks;
    } catch (error) {
        sendMsg(ctx, 400, 'invalid product id');
        return;
    }
}

module.exports = {
    getSellerProducts,
    getAllProducts,
    getSingleProduct,
    addProduct,
    updateProduct,
    deleteProduct,
    addStock,
    getProductReview,
    addReviews,
    getStock
}