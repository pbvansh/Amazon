const { ObjectId } = require('mongodb');
const { client } = require('../database/db');
const { sendMsg } = require('../utils/msg');
const Cart = client.db('test').collection('cart')


const getCartItems = async (ctx) => {
    ctx.body = await Cart.find({ userId: ctx.user._id, isOrdered: false }).toArray();
}

const addItem = async (ctx) => {
    const { productId, qnt } = ctx.request.body;
    const { _id: userId } = ctx.user;
    await Cart.insertOne({
        userId,
        productId,
        qnt,
        isOrdered: false
    })
    sendMsg(ctx, 201, 'item added to cart');
}

const updateCartItem = async (ctx) => {
    const _id = new ObjectId(ctx.request.params.id);
    await Cart.updateOne({ _id, userId: ctx.user._id }, { $set: { qnt: ctx.request.body.qnt } });
    sendMsg(ctx, 200, 'item updated successfully')
}

const removeItems = async (ctx) => {
    const _id = new ObjectId(ctx.request.params.id);
    await Cart.deleteOne({ _id, userId: ctx.user._id });
    sendMsg(ctx, 200, 'item removed from your cart')
}

module.exports = {
    getCartItems,
    addItem,
    updateCartItem,
    removeItems
}