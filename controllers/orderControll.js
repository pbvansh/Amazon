const { ObjectId } = require('mongodb');
const { client } = require('../database/db');
const { sendMsg } = require('../utils/msg');
const Order = client.db('test').collection('orders')
const Stock = client.db('test').collection('stocks');

const getMyOrder = async (ctx) => {
    const orders = await Order.aggregate([
        {
            $match: { userId: ctx.user._id }
        },
        {
            $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "product"
            }
        },
        {
            $unwind: {
                path: "$product",
                preserveNullAndEmptyArrays: true
            }
        },
    ]).toArray();
    ctx.body = orders;
}
const getAllSellerOrders = async (ctx) => {
    const orders = await Order.aggregate([
        {
            $match: {
                "companyId": ctx.user.companyId
            }
        },
        {
            $lookup: {
                from: "address",
                localField: "address",
                foreignField: "_id",
                as: "address"
            }
        },
        {
            $unwind: {
                path: "$address",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                productId: 1,
                userId: 1,
                qnt: 1,
                total: 1,
                isCanceled: 1,
                status: 1,
                address: 1
            }
        }
    ]).toArray();
    ctx.body = orders;
}


const placeOrder = async (ctx) => {
    //     2           1
    //['pandding','delivered']
    const { products, address } = ctx.request.body;
    for (const product of products) {
        await Order.insertOne({
            productId: product.id,
            userId: ctx.user._id,
            qnt: product.qnt,
            total: product.total,
            companyId: product.companyId,
            shippingFrom: product.shippingAddress,
            status: 2,
            address,
            isCanceled: false
        })
        await Stock.updateOne({
            productId: product.id,
            place: product.shippingAddress
        }, {
            $inc: {
                stock: -product.qnt
            }
        })
    }
    sendMsg(ctx, 201, 'order placed successfully.')
}

const updateOrder = async (ctx) => {
    const { upData } = ctx.state;
    console.log(upData);
    const orderId = new ObjectId(ctx.request.params.id);
    const res = await Order.updateOne({ _id: orderId, isCanceled: false }, { $set: upData });
    if (res.matchedCount > 0) sendMsg(ctx, 200, 'order updated successfully')
    else sendMsg(ctx, 400, 'this order is not available')
}

const changeOrderStatus = async (ctx) => {
    const orderId = new ObjectId(ctx.request.params.id);
    const { status } = ctx.request.body;
    const res = await Order.updateOne({ _id: orderId, isCanceled: false }, { $set: { status } });
    if (res.matchedCount > 0) sendMsg(ctx, 200, 'order updated successfully');
    else sendMsg(ctx, 400, 'this order is not available')
}

const canceleOrder = async (ctx) => {
    const orderId = new ObjectId(ctx.request.params.id);
    const { order } = ctx
    await Order.updateOne({ _id: orderId, isCanceled: false }, { $set: { isCanceled: true } });
    await Stock.updateOne({
        productId: order.productId,
        place: order.shippingFrom
    }, {
        $inc: {
            stock: order.qnt
        }
    })
    sendMsg(ctx, 200, 'order cancled');
}



module.exports = {
    placeOrder,
    getAllSellerOrders,
    updateOrder,
    canceleOrder,
    changeOrderStatus,
    getMyOrder
}