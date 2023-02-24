const koa = require('koa');
const { connectToDatabase } = require('./database/db');
const bodyParser = require('koa-bodyparser')
const userRouter = require('./routes/userRoutes')
const addressRouter = require('./routes/addressRoute')
const productRouter = require('./routes/productRoute')
const orderRouter = require('./routes/orderRoute')
const cartRouter = require('./routes/cartRoute')
require('dotenv').config();

const port = process.env.PORT;

connectToDatabase();

const app = new koa();

app.use(bodyParser())
app.use(userRouter.routes()).use(userRouter.allowedMethods())
app.use(addressRouter.routes()).use(addressRouter.allowedMethods())
app.use(productRouter.routes()).use(productRouter.allowedMethods())
app.use(orderRouter.routes()).use(orderRouter.allowedMethods())
app.use(cartRouter.routes()).use(cartRouter.allowedMethods())

app.listen(port, () => {
    console.log('server is running on ' + port);
})