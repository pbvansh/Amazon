const { sendMsg } = require("../utils/msg");
const { ObjectId } = require('mongodb');
const { client } = require('../database/db');
const Address = client.db('test').collection('address')


const isMobile = async (ctx, next) => {
    const { mobile } = ctx.request.body;
    const reg = /^\d{10}$/;
    if (!reg.test(mobile)) {
        sendMsg(ctx, 400, 'invalid mobile number');
        return;
    }
    await next()
}

const isPincode = async (ctx, next) => {
    const { pincode } = ctx.request.body;
    const reg = /^\d{6}$/;
    if (!reg.test(pincode)) {
        sendMsg(ctx, 400, 'invalid pincode number')
        return;
    }
    await next()
}
const isValidType = async (ctx, next) => {
    const { type } = ctx.request.body;
    const types = ['home', 'work']
    if (!types.includes(type)) {
        sendMsg(ctx, 400, 'invalid address type');
        return;
    }
    await next()
}
const isUniqAddress = async (ctx, next) => {
    const { address } = ctx.request.body;
    const count = await Address.countDocuments({ userId: ctx.user._id, address })
    if (count > 0) {
        sendMsg(ctx, 400, 'Add diffrent address');
        return;
    }
    await next()
}

module.exports = {
    isMobile,
    isPincode,
    isValidType,
    isUniqAddress
}