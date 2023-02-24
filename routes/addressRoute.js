const Router = require('koa-router');
const { addAddress, updateAddress, deleteAddress, myAddress, setPrimaryAddress } = require('../controllers/addressControll');
const { protect } = require('../middlewares/userMiddl');
const { isMobile, isPincode, isValidType, isUniqAddress } = require('../validators/addressValid');
const { trimData, requiredField } = require('../validators/userValid');

const route = new Router({
    prefix: '/address'
})

route.get('/', protect, myAddress)
route.post('/', protect, trimData, requiredField, isUniqAddress, isMobile, isPincode, isValidType, addAddress)
route.patch('/:id', protect, setPrimaryAddress)
route.put('/:id', protect, trimData, requiredField, isMobile, isPincode, isValidType, updateAddress)
route.delete('/:id', protect, deleteAddress)

module.exports = route;