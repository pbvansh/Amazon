const { ObjectId } = require("mongodb")
const { sendMsg } = require("../utils/msg")
const { client } = require('../database/db');
const Cart = client.db('test').collection('cart')
const Product = client.db('test').collection('products')

const isValidId = async (ctx, next) => {
    try {
        ctx.request.body.productId = new ObjectId(ctx.request.body.productId);
        const count = await Product.countDocuments({ _id: ctx.request.body.productId, isDeleted: false });
        if (count === 0) {
            sendMsg(ctx, 400, 'this product is not availeble');
            return;
        }
        await next()
    } catch (error) {
        console.log(error);
        sendMsg(ctx, 400, 'Product id is not valid')
    }
}

const isItemExist = async (ctx, next) => {
    try {
        const _id = new ObjectId(ctx.request.params.id);
        const item = await Cart.countDocuments({ _id, isOrdered: false, userId: ctx.user._id })
        // console.log(item);
        if (item === 0) {
            sendMsg(ctx, 400, 'Item is not present in your cart');
            return;
        }
        await next()
    } catch (error) {
        sendMsg(ctx, 400, -'Invalid id');
    }

}

const isItemExistInCart = async (ctx, next) => {
    const { productId } = ctx.request.body;
    const item = await Cart.countDocuments({ productId, isOrdered: false, userId: ctx.user._id })
    // console.log(item);
    if (item > 0) {
        sendMsg(ctx, 400, 'this item is already present in your cart');
        return;
    }
    await next();
}

module.exports = {
    isValidId,
    isItemExistInCart,
    isItemExist
}