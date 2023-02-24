const JWT = require('jsonwebtoken');
const { client } = require('../database/db');
const { sendMsg } = require('../utils/msg');
const User = client.db('test').collection('users')
const Invite = client.db('test').collection('invitation')
require('dotenv').config()

const protect = async (ctx, next) => {
    if (ctx.headers.authorization && ctx.headers.authorization.startsWith('Bearer')) {
        const token = ctx.headers.authorization.split(' ')[1];
        if (!token) {
            sendMsg(ctx, 401, 'Access denied. Not Authenticated...');
            return;
        }
        try {
            const secret = process.env.JWT_SECRET;
            const { email, passwordModifyAt } = JWT.verify(token, secret)
            const user = await User.findOne({ email, isDeleted: false })
            if (!user) {
                sendMsg(ctx, 401, 'Unauthorized user.');
                return;
            }
            if (user?.companyId) {
                const company = await User.findOne({ _id: user.companyId, isDeleted: false })
                if (!company) {
                    sendMsg(ctx, 401, 'Your selling company is not exists.');
                    return;
                }
            }
            if (user.passwordModifyAt.getTime() !== new Date(passwordModifyAt).getTime()) {
                sendMsg(ctx, 400, "please log in to your account for security purposes.");
                return;
            }
            ctx.user = user;
            await next();
        } catch (err) {
            console.log(err);
            sendMsg(ctx, 401, 'Access denied. Invalid auth token...');
            return;
        }
    } else {
        sendMsg(ctx, 401, 'Not Authorze');
        return;
    }
}

const isSeller = async (ctx, next) => {
    if (ctx.user.isSeller) {
        await next();
    } else {
        sendMsg(ctx, 400, 'you have no permission.');
        return;
    }
}



// const isAdminOrOwner = async (ctx, next) => {
//     let isInvited = false;
//     if (ctx.user?.isInvited) {
//         const isUserExist = await Invite.countDocuments({ reciver: ctx.user.email, status: 1, role: 'admin' })
//         if (isUserExist > 0) isInvited = true;
//     }
//     if (ctx.user.isSeller || isInvited) {
//         await next();
//     } else {
//         sendMsg(ctx, 400, 'Access denied. only account owner or admin can do it.');
//         return;
//     }
// }

const isPartOfCompany = async (ctx, next) => {
    let isInvited = false;
    if (ctx.user?.isInvited) {
        const isUserExist = await Invite.countDocuments({ reciver: ctx.user.email, status: 1 })
        if (isUserExist > 0) isInvited = true;
    }
    if (ctx.user.companyId || isInvited) {
        await next();
    } else {
        sendMsg(ctx, 400, 'Access denied. you have no permission');
        return;
    }
}


module.exports = {
    protect,
    isSeller,
    isPartOfCompany
}