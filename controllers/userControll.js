
const { BcyptPassword, createJWT } = require('../utils/jwt');
const Bcypt = require('bcryptjs')
const { sendMsg } = require('../utils/msg');
const { client } = require('../database/db');
const { ObjectId } = require('mongodb');
const User = client.db('test').collection('users')
const Invite = client.db('test').collection('invitation')

const signup = async (ctx) => {
    const { isInvited, email: reciver, companyId, isSeller } = ctx.request.body;
    const _id = new ObjectId();
    const date = new Date()
    if (isInvited) {
        await Invite.updateOne({ reciver }, { $set: { status: 1 } })
    }
    ctx.request.body.password = await BcyptPassword(ctx.request.body.password)
    isSeller && (ctx.request.body.companyId = companyId || _id)
    await User.insertOne({
        ...ctx.request.body,
        _id,
        createdAt: date,
        passwordModifyAt: date,
        isDeleted: false
    })
    sendMsg(ctx, 201, 'signup successfully')
}

const login = async (ctx) => {
    try {
        const { email, password } = ctx.request.body;
        const user = await User.findOne({ email })
        if (user && await Bcypt.compare(password, user.password)) {
            const data = {
                id: user._id,
                email: user.email,
                userName: user.userName,
                passwordModifyAt: user?.passwordModifyAt
            }
            // console.log(data);
            ctx.body = {
                status: 200,
                msg: 'login successfully',
                token: createJWT(data)
            }
            return;
        } else {
            sendMsg(ctx, 400, 'invalid email or password');
            return;
        }
    } catch (error) {
        console.log(error);
    }

}

const inviteTeamMember = async (ctx) => {
    const { role, email, permission } = ctx.request.body;
    const data = {
        companyId: ctx.user.companyId,
        sender: ctx.user.email,
        reciver: email,
        role,
        status: 2
    }
    permission ? data.permission = permission : null;
    const invitationId = await Invite.insertOne(data)
    const url = ctx.host + '/user/signup?token=';
    ctx.body = {
        status: 200,
        msg: 'invitation send successfully',
        link: url + createJWT({ invitationId: invitationId.insertedId })
    }
    return;
}

//change
const getTeamMembers = async (ctx) => {
    ctx.body = await Invite.aggregate([
        {
            $match: {
                companyId: ctx.user.companyId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "reciver",
                foreignField: "email",
                as: "user"
            }
        }, {
            $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                invitedBy: "$sender",
                userName: "$user.userName",
                email: "$user.email",
                role: 1,
                joinedAt: "$user.createdAt"
            }
        }
    ]).toArray();
}

const changePassword = async (ctx) => {
    try {
        const { oldPassword, newPassword } = ctx.request.body;
        const { email, password } = ctx.user;
        // const user = await User.findOne({ email });
        if (await Bcypt.compare(oldPassword, password)) {
            await User.updateOne({ email }, { $set: { password: await BcyptPassword(newPassword) } });
            sendMsg(ctx, 200, 'Password change successfully.');
            return;
        }
        sendMsg(ctx, 400, 'Old password is not valid. Please enter valid old password');
        return;
    } catch (error) {
        console.log(error);
    }

}

const forgotePasswordLink = async (ctx) => {
    const { email, secret } = ctx.request.body;
    const url = ctx.host + '/user/forgotepassword/' + createJWT({ email }, secret);
    ctx.body = {
        email,
        link: url
    }
}

const forgotePassword = async (ctx) => {
    const { verifyToken } = ctx;
    const { modifiedCount } = await User.updateOne({ email: verifyToken.email, isDeleted: false }, { $set: { password: await BcyptPassword(ctx.request.body.newPassword), passwordModifyAt: new Date() } });
    if (modifiedCount > 0) ctx.body = { msg: 'password change successfully' };
    else {
        sendMsg(ctx, 400, 'user is not exist');
        return;
    }
    return;
}

const changeRole = async (ctx) => {
    const { email, role } = ctx.request.body;
    const res = await Invite.updateOne({
        companyId: ctx.user.companyId,
        reciver: email,
    }, { $set: { role } })
    if (res.matchedCount > 0) sendMsg(ctx, 200, 'role updated successfully');
    else sendMsg(ctx, 400, 'this user is not in your company')
}

const deleteUser = async (ctx) => {
    const _id = new ObjectId(ctx.request.params.id);
    await User.updateOne({ _id }, { $set: { isDeleted: true } });
    sendMsg(ctx, 200, 'user deleted successfully')
}

module.exports = {
    signup,
    login,
    inviteTeamMember,
    getTeamMembers,
    changePassword,
    forgotePasswordLink,
    forgotePassword,
    changeRole,
    deleteUser
}