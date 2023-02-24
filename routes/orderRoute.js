const Router = require('koa-router');
const { getMyOrder, placeOrder, updateOrder, canceleOrder, getAllSellerOrders, changeOrderStatus } = require('../controllers/orderControll');
const { protect } = require('../middlewares/userMiddl');
const { setAddress, isValidOrder, isValidStatus, canChange, updateData, setShippingAddress, getProductOfOrder } = require('../validators/orderValid');
const { trimData, isAdminOrOwner } = require('../validators/userValid');

const route = new Router({
    prefix: '/order'
})

//admin, owner -- all
//member -- no
route.get('/', protect, getMyOrder)
route.get('/seller', protect, isAdminOrOwner, getAllSellerOrders)
route.post('/', protect, trimData, setAddress, isValidOrder, setShippingAddress, placeOrder)
route.put('/:id', protect, trimData, canChange, updateData, updateOrder)
route.patch('/:id', protect, isAdminOrOwner, isValidStatus, changeOrderStatus)
route.delete('/:id', protect,getProductOfOrder, canceleOrder)

module.exports = route;