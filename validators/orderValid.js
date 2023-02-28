const { sendMsg } = require("../utils/msg");
const { client } = require('../database/db');
const { ObjectId } = require("mongodb");
const { getStock } = require("../utils/stock");
const Address = client.db('test').collection('address')
const Product = client.db('test').collection('products')
const Order = client.db('test').collection('orders')
const Stock = client.db('test').collection('stocks');


const isValidStatus = async (ctx, next) => {
    const { status } = ctx.request.body;
    const allStatus = [1]
    if (!status) {
        sendMsg(ctx, 400, 'status is required');
        return;
    }
    if (!allStatus.includes(status)) {
        sendMsg(ctx, 400, 'invalid order status');
        return;
    }
    await next()
}

const setAddress = async (ctx, next) => {
    const address = await Address.findOne({ userId: ctx.user._id, isPrimary: true });
    if (!address) {
        sendMsg(ctx, 400, 'please first set your primary address');
        return;
    }
    ctx.request.body.address = address._id;
    ctx.request.body.customerState = address.state;
    await next()
}
const canChange = async (ctx, next) => {
    const orderId = new ObjectId(ctx.request.params.id);
    const count = await Order.countDocuments({ userId: ctx.user._id, isCanceled: false, status: 2, _id: orderId });
    // console.log(count);
    if (count == 0) {
        sendMsg(ctx, 400, "you can not make chages");
        return;
    }
    await next()
}
const updateData = async (ctx, next) => {
    ctx.state.upData = {}
    const { qnt, address } = ctx.request.body;
    if (qnt) {
        ctx.state.upData.qnt = qnt
    }
    if (address) {
        if (!ObjectId.isValid(address)) {
            sendMsg(ctx, 400, 'invalid address');
            return;
        }
        ctx.state.upData.qnt = new ObjectId(address)
    }
    await next()
}

const isValidOrder = async (ctx, next) => {
    try {
        const { products, total } = ctx.request.body;
        let subTotal = 0;
        let productError = [];
        for (const product of products) {
            product.id = new ObjectId(product.id)
            const prod = await Product.findOne({ _id: product.id, isDeleted: false });
            if (!prod) {
                sendMsg(ctx, 400, 'product id is invalid');
                return;
            }

            //------check stock of product
            const stocks = await getStock(product.id);
            // console.log(stocks);
            if (stocks == 0) {
                productError.push(`${prod.name}(${product.id}) is out of stock`);
            }
            else if (stocks < product.qnt) {
                productError.push(`We have only ${stocks} ${prod.name}(${product.id})`);
            }

            //---------add company id with product
            Object.assign(product, {
                companyId: prod.companyId,
                status: 2,
                total: (prod.price * product.qnt)
            })
            //find total
            subTotal += product.total
        }
        if (productError.length > 0) {
            sendMsg(ctx, 400, productError);
            return;
        }
        // console.log(ctx.request.body);
        if (total !== subTotal) {
            sendMsg(ctx, 400, `your total is ${subTotal}`);
            return;
        }
        await next();
    } catch (error) {
        console.log(error);
        sendMsg(ctx, 400, 'invalid product id');
        return;
    }
}

const setShippingAddress = async (ctx, next) => {
    const { products, customerState } = ctx.request.body;
    // console.log(customerState);
    let error = []
    for (const product of products) {
        const stocks = await Stock.findOne({ productId: product.id });
        // console.log(stocks);
        const haveStock = stocks.stockAt.some((stock) => {
            return stock.place === customerState && stock.stocks >= product.qnt
        })
        if (haveStock) {
            product.shippingAddress = customerState;
        } else {
            const availableStock = stocks.stockAt.find((stock) => {
                return stock.stocks >= product.qnt;
            })
            if (!availableStock) {
                error.push(`${product.id} is currently unavaileble`)
            } else {
                product.shippingAddress = availableStock.place;
            }
        }
    }
    if (error.length > 0) {
        sendMsg(ctx, 400, error);
        return;
    }
    // console.log(ctx.request.body);
    await next();
}

const getProductOfOrder = async (ctx, next) => {
    try {
        const orderId = new ObjectId(ctx.request.params.id);
        const order = await Order.findOne({ _id: orderId, isCanceled: false, userId: ctx.user._id });
        if (!order) {
            sendMsg(ctx, 400, 'this order is not availeble');
            return;
        }
        ctx.order = order;
        await next()
    } catch (error) {
        console.log(error);
        sendMsg(ctx, 400, 'invalid order id');
        return;
    }
}

module.exports = {
    isValidStatus,
    setAddress,
    isValidOrder,
    setShippingAddress,
    canChange,
    updateData,
    getProductOfOrder
}