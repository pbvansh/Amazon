
const sendMsg = (ctx, code, msg) => {
    ctx.status = code;
    ctx.body = { status: code, msg };
}

module.exports = {
    sendMsg
}