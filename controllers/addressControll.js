const { ObjectId } = require('mongodb');
const { client } = require('../database/db');
const { sendMsg } = require('../utils/msg');
const Address = client.db('test').collection('address')

const myAddress = async (ctx) => {
    const { _id: userId } = ctx.user;
    const address = await Address.find({ userId }, { projection: { userId: 0 } }).toArray()
    ctx.body = {
        status: 200,
        address
    };
}

const setPrimaryAddress = async (ctx) => {
    const addressId = ctx.request.params.id;
    const { _id: userId } = ctx.user;
    await Address.updateOne({ userId, isPrimary: true }, {
        $set: {
            isPrimary: false
        }
    });
    await Address.updateOne({ userId, _id: new ObjectId(addressId) }, {
        $set: {
            isPrimary: true
        }
    });
    sendMsg(ctx, 201, 'address set as primary address.')
}

const addAddress = async (ctx) => {
    const { mobile, address, city, state, pincode, type } = ctx.request.body;
    const { _id: userId } = ctx.user;
    const totalAddress = await Address.countDocuments({ userId })
    await Address.insertOne({
        userId, mobile, address, city, state, pincode, type,
        isPrimary: totalAddress == 0 ? true : false
    })
    sendMsg(ctx, 201, 'address created successfully')
}

const updateAddress = async (ctx) => {
    const addressId = ctx.request.params.id;
    const { mobile, address, city, state, pincode, type } = ctx.request.body;
    await Address.updateOne({ _id: new ObjectId(addressId) }, {
        $set: { mobile, address, city, state, pincode, type }
    })
    sendMsg(ctx, 200, 'address updated successfully')
}

const deleteAddress = async (ctx) => {
    const addressId = ctx.request.params.id;
    const res = await Address.deleteOne({ _id: new ObjectId(addressId) })
    if (res.deletedCount > 0) sendMsg(ctx, 200, 'address deleted successfully')
    else sendMsg(ctx, 400, 'address not found')
}


module.exports = {
    myAddress,
    setPrimaryAddress,
    addAddress,
    updateAddress,
    deleteAddress
}