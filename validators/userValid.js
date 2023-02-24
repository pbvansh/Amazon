const { sendMsg } = require("../utils/msg");
const { client } = require('../database/db');
const { verifyJWT, decodeJWT } = require("../utils/jwt");
const { ObjectId } = require("mongodb");
const User = client.db('test').collection('users')
const Invite = client.db('test').collection('invitation')

const trimData = async (ctx, next) => {
    const dataForTrim = ctx.request.body;
    Object.keys(dataForTrim).forEach((key) => {
        if (typeof dataForTrim[key] == 'string') dataForTrim[key] = dataForTrim[key].trim()
    })
    await next()
}

const setRoleOrEmail = async (ctx, next) => {
    try {
        const { token } = ctx.request.query;
        if (token) {
            const { invitationId } = verifyJWT(token);
            const user = await Invite.findOne({ _id: new ObjectId(invitationId) })
            // console.log(user);
            if (!user) {
                sendMsg(ctx, 400, 'this invitation link is not valid');
                return;
            }
            const isSenderOrgExsist = await User.countDocuments({ email: user.sender })
            // console.log(isSenderOrgExsist);
            if (isSenderOrgExsist !== 1) {
                sendMsg(ctx, 400, 'Sender orgenazation is not exsist.');
                return;
            }
            ctx.request.body = {
                ...ctx.request.body,
                email: user.reciver,
                isInvited: true,
                companyId: user.companyId
            }
        }
        await next()
    } catch (error) {
        console.log(error);
        sendMsg(ctx, 400, 'Sender orgenazation is not exsist.');
        return;
    }

}

const isEmail = async (ctx, next) => {
    const { email } = ctx.request.body;
    const reg = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!reg.test(email)) {
        sendMsg(ctx, 400, 'Please provide valid email');
        return;
    }
    await next();
}


const isPassword = async (ctx, next) => {
    const { password, oldPassword, newPassword, comfPassword } = ctx.request.body;
    if (ctx.request.url.startsWith('/user/forgotepwd/') && (!newPassword || !comfPassword)) {
        sendMsg(ctx, 400, 'please provide newPassword or comfPassword');
        return;
    } else if (ctx.request.url.startsWith('/user/changepassword') && (!newPassword || !comfPassword || !oldPassword)) {
        sendMsg(ctx, 400, 'please provide passwords');
        return;
    } else if ((ctx.request.url.startsWith('/user/signup') || ctx.request.url.startsWith('/user/login')) && (!password)) {
        sendMsg(ctx, 400, 'please provide password');
        return;
    }
    await next()
}

const canInvite = async (ctx, next) => {
    const { email } = ctx.request.body;
    await isEmail(ctx, async () => {
        if (ctx.user.email === email) {
            sendMsg(ctx, 400, 'you can not invite your self');
            return;
        }
        //-----------check if user already invited or not
        const invitaion = await Invite.findOne({ companyId: ctx.user.companyId, reciver: email });
        if (invitaion) {
            sendMsg(ctx, 400, `this user is already invited for ${invitaion.role} role`);
            return;
        } else {
            await next()
        }
    })
}

const isAdminOrOwner = async (ctx, next) => {
    let isInvited = false;
    if (ctx.user?.isInvited) {
        const isUserExist = await Invite.countDocuments({ reciver: ctx.user.email, status: 1, role: 'admin' })
        if (isUserExist > 0) isInvited = true;
    }
    if (!ctx.user.companyId) {
        sendMsg(ctx, 400, 'you have no permission');
        return;
    }
    if (ctx.user?.companyId.toString() == ctx.user._id.toString() || isInvited) {
        await next();
    } else {
        sendMsg(ctx, 400, 'Access denied. only account owner or admin can do it.');
        return;
    }
}

const checkPassword = async (ctx, next) => {
    const { password, oldPassword, newPassword, comfPassword } = ctx.request.body;
    const reg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

    if (password || oldPassword) {
        const pass = password || oldPassword;
        if (!reg.test(pass)) {
            sendMsg(ctx, 400, `Please provide valid ${password ? 'password' : 'oldPassword'}`);
            return;
        }
    }
    if (newPassword && comfPassword) {
        if (!reg.test(newPassword)) {
            sendMsg(ctx, 400, 'Please provide valid newPassword');
            return;
        }
        if (newPassword !== comfPassword) {
            sendMsg(ctx, 400, "new password and confirm password are not match.");
            return;
        }
    }
    if (oldPassword && newPassword) {
        if (oldPassword === newPassword) {
            sendMsg(ctx, 400, "please enter diffrent password.");
            return;
        }
    }
    await next();

}

const isUniqMail = async (ctx, next) => {
    const { email } = ctx.request.body;
    const emailCount = await User.countDocuments({ email, isDeleted: false })
    if (emailCount > 0) {
        sendMsg(ctx, 400, "Email alredy registered.");
        return;
    }
    await next()
}

const isRole = async (ctx, next) => {
    const roles = ['admin', 'member'];
    const { role } = ctx.request.body;
    if (!roles.includes(role)) {
        sendMsg(ctx, 400, 'Role is not valid');
        return;
    }
    await next();
}


const requiredField = async (ctx, next) => {
    let fields;
    const errors = { validationError: [] };
    const requestBodyFields = Object.keys(ctx.request.body)
    if (requestBodyFields.length == 0) {
        sendMsg(ctx, 400, 'provide all information');
        return;
    }
    if (ctx.url.includes('/user/signup')) {
        fields = ['email', 'userName', 'password']
    }
    else if (ctx.url === '/user/invite') {
        fields = ['email', 'role']
    }
    else if (ctx.url === '/user/login') {
        fields = ['email', 'password']
    }
    else if (ctx.url === '/user/changerole') {
        fields = ['email', 'role']
    }
    else if (ctx.url === '/address') {
        fields = ['mobile', 'address', 'city', 'state', 'pincode', 'type']
    }
    else if (ctx.url === '/product') {
        fields = ['name', 'price', 'image']
    }
    else if (ctx.url === '/product/stock') {
        fields = ['productId', 'stock', 'place']
    }
    else if (ctx.url === '/order') {
        fields = ['products', 'total']
    }
    else if (ctx.url === '/cart') {
        fields = ['productId', 'qnt']
    }
    else if (ctx.url == '/product/review') {
        fields = ['review', 'rating', 'productId']
    }
    fields?.forEach((filed) => {
        if (!requestBodyFields.includes(filed)) {
            errors.validationError = [...errors.validationError, `${filed} is required field.`]
        }
    })

    if (Object.keys(errors.validationError).length > 0) {
        sendMsg(ctx, 400, errors);
        return;
    }
    await next();
}

const isMailExsistOrNot = async (ctx, next) => {
    const { email } = ctx.request.body;
    const user = await User.findOne({ email });
    if (!user) {
        sendMsg(ctx, 400, 'email is not exist');
        return;
    }
    ctx.request.body.secret = user.password;
    await next()
}
const canDelete = async (ctx, next) => {
    const { id } = ctx.request.params;
    console.log(ctx.user._id.toString() === id);
    if (!(ctx.user._id.toString() === id)) {
        // console.log('in if');
        const user = await User.findOne({ _id: new ObjectId(id), isDeleted: false });
        if (!user) {
            sendMsg(ctx, 400, 'user is not exists');
            return;
        }
        // --- delete invitaion record
        const isInCompany = await Invite.deleteOne({
            companyId: ctx.user?.companyId,
            reciver: user.email,
            status: 1
        })
        // console.log(isInCompany);
        if (isInCompany.deletedCount === 0) {
            sendMsg(ctx, 400, 'you have no permission');
            return;
        }
    }
    await next()
}

const isValidForegatePasswordLink = async (ctx, next) => {
    try {
        const { token } = ctx.request.params;
        const decodedToken = decodeJWT(token)
        // console.log(decodedToken);
        const user = await User.findOne({ email: decodedToken.email }, { projection: { password: 1 } });
        const verifyToken = verifyJWT(token, user.password);
        if (!verifyToken) {
            sendMsg(ctx, 400, "This link is no longer available.");
            return;
        }
        ctx.verifyToken = verifyToken;
        await next()
    } catch (e) {
        console.log(e);
        sendMsg(ctx, 400, 'Forgote password link is incorrect.');
        return;
    }
}

const createState = async (ctx, next) => {
    let fields;
    ctx.state.bodyData = {}
    if (ctx.url === '/user/signup') {
        fields = ['email', 'userName', 'password', 'isSeller']
    }
    else if (ctx.url === '/addaddress') {
        fields = ['mobile', 'address', 'city', 'state', 'pincode', 'type']
    }
    else if (ctx.url === '/product/stock') {
        fields = ['productId', 'stock', 'place']
    }
    else if (ctx.url.includes('/product')) {
        fields = ['name', 'price', 'desc', 'category', 'image', 'isDeleted']
    }
    for (let field of fields) {
        if (ctx.request.body[field]) ctx.state.bodyData[field] = ctx.request.body[field]
    }
    await next()
}


const isUserExist = async (ctx, next) => {
    const { email } = ctx.request.body;
    //----check if user is exixst or not
    const emailExist = await User.countDocuments({ email, isDeleted: true });
    // console.log(emailExist);
    if (emailExist > 0) {
        sendMsg(ctx, 400, 'user is not exist');
        return;
    }
    await next();
}

module.exports = {
    setRoleOrEmail,
    trimData,
    requiredField,
    isEmail,
    canInvite,
    isMailExsistOrNot,
    isUniqMail,
    isPassword,
    checkPassword,
    isRole,
    createState,
    isValidForegatePasswordLink,
    isAdminOrOwner,
    canDelete,
    isUserExist
}