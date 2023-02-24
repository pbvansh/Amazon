const Router = require('koa-router');
const { addItem, removeItems, getCartItems, updateCartItem } = require('../controllers/cartControll');
const { protect } = require('../middlewares/userMiddl');
const { isItemExistInCart, isValidId, isItemExist } = require('../validators/cartValid');
const { trimData, requiredField, createState } = require('../validators/userValid');

const route = new Router({
    prefix: '/cart'
})

route.get('/', protect, getCartItems)
route.post('/', protect, trimData, requiredField, isValidId, isItemExistInCart, addItem)
route.patch('/:id', protect, isItemExist, updateCartItem)
route.delete('/:id', protect, isItemExist, removeItems)

module.exports = route;