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
                as: "stocks"
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
                stocks: 1,
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
                localField: 'companyId',
                foreignField: '_id',
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
    await Product.updateOne({ _id: productId }, { $set: bodyData })
    sendMsg(ctx, 200, 'Product updated successfully');
}

const deleteProduct = async (ctx) => {
    const productId = new ObjectId(ctx.request.params.id)
    await Product.updateOne({ _id: productId }, { $set: { isDeleted: true } })
    sendMsg(ctx, 200, 'Product deleted successfully');
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
    const { bodyData } = ctx.state;
    await Stock.insertOne(bodyData);
    sendMsg(ctx, 201, 'stock added successfully')
}

const getStock = async (ctx) => {
    try {
        const { id } = ctx.request.params;
        const stocks = await Stock.find({
            productId: new ObjectId(id)
        }).toArray();
        ctx.body = stocks;
    } catch (error) {
        sendMsg(ctx, 400, 'invalid product id');
        return;
    }
}

module.exports = {
    getSellerProducts,
    getAllProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    addStock,
    getProductReview,
    addReviews,
    getStock
}