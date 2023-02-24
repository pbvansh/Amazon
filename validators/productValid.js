const { sendMsg } = require("../utils/msg");
const { client } = require('../database/db');
const { ObjectId } = require("mongodb");
const Product = client.db('test').collection('products')
const Invite = client.db('test').collection('invitation')
const Review = client.db('test').collection('reviews')
const Stock = client.db('test').collection('stocks');

const isImgUrl = async (ctx, next) => {
    const { image } = ctx.request.body;
    const reg = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/i;
    if (image && !reg.test(image)) {
        sendMsg(ctx, 400, 'Please provide valid iamge URL');
        return;
    }
    await next();
}
const isPrice = async (ctx, next) => {
    const { price } = ctx.request.body;
    if (typeof price !== 'number') {
        sendMsg(ctx, 400, 'enter valid price');
        return;
    }
    await next();
}
const isRating = async (ctx, next) => {
    const { rating } = ctx.request.body;
    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
        sendMsg(ctx, 400, 'enter valid rating');
        return;
    }
    await next();
}

const isUniqProductName = async (ctx, next) => {
    const { name } = ctx.request.body;
    const productId = new ObjectId(ctx.request.params.id)
    const isUniq = await Product.countDocuments({ name, _id: { $ne: productId }, companyId: ctx.user.companyId })
    if (isUniq > 0) {
        sendMsg(ctx, 400, 'product is already exists');
        return;
    }
    await next();
}

//delete
const setSellerId = async (ctx, next) => {
    let sellerId;
    if (ctx.user?.isInvited) {
        const invitedUser = await Invite.findOne({ reciver: ctx.user.email, status: 1 })
        sellerId = invitedUser.senderId;
    }
    if (ctx.user.isSeller) {
        sellerId = ctx.user._id;
    }
    console.log(sellerId);
    ctx.state.bodyData.sellerId = sellerId;
    await next();
}

const havePermission = async (ctx, next) => {
    const productId = new ObjectId(ctx.request.params.id)
    const product = await Product.countDocuments({ _id: productId, companyId: ctx.user.companyId })
    // console.log(product);
    if (product !== 1) {
        sendMsg(ctx, 400, 'you can not make changes in other seller products');
        return;
    }
    await next();
}

const canGiveReview = async (ctx, next) => {
    const { productId } = ctx.request.body;
    const { _id: userId } = ctx.user;
    const product = await Product.findOne({ _id: productId })
    // console.log(product);
    if (!product) {
        sendMsg(ctx, 400, 'This product is not exit.');
        return;
    }
    count = await Review.countDocuments({ productId, userId })
    if (count > 0) {
        sendMsg(ctx, 400, 'you alredy give review to this product');
        return;
    }
    await next()
}


const filter = async (ctx, next) => {
    const { sortBy, filterBy, page = 1, limit = 10 } = ctx.request.query;
    let noOfDoc = Number(limit);
    if (noOfDoc < 1) {
        sendMsg(ctx, 400, 'The limit must be positive or > 0');
        return;
    }
    let skip = ((Number(limit) * Number(page)) - Number(limit));
    skip < 0 ? skip = 0 : null;
    let sort = {}, filter = {}, date = {};
    if (sortBy) {
        sortBy.split(',').forEach((val) => {
            const data = val.split('_');
            sort[data[0]] = Number(data[1]);
        })
    }

    if (filterBy) {
        filterBy.split(',').forEach((val) => {
            const data = val.split('_');
            if (data[0] == 'company') {
                const names = data[1].slice(1, -1).split('||');
                data[1] = { $in: names }
            }
            filter[data[0]] = data[1]
        })
    }

    ctx.allFilters = { sort, filter, skip, noOfDoc };
    await next()
}

const isPlaceUniq = async (ctx, next) => {
    const { place, productId } = ctx.request.body;
    const stock = await Stock.findOne({ place, productId })
    if (stock) {
        sendMsg(ctx, 400, `${place} have already ${stock.stock} stocks. Add different place`);
        return;
    }
    await next()
}

module.exports = {
    isUniqProductName,
    isImgUrl,
    isPrice,
    isRating,
    setSellerId,
    havePermission,
    canGiveReview,
    filter,
    isPlaceUniq
}