const Router = require('koa-router');
const { getAllProducts, addProduct, updateProduct, deleteProduct, addReviews, getProductReview, getSellerProducts, addStock, getStock } = require('../controllers/productContoll');
const { protect, isSeller, isPartOfCompany } = require('../middlewares/userMiddl');
const { isValidId } = require('../validators/cartValid');
const { isImgUrl, isUniqProductName, setSellerId, havePermission, canGiveReview, isPrice, filter, isRating, isPlaceUniq } = require('../validators/productValid');
const { createState, requiredField, isAdminOrOwner, trimData } = require('../validators/userValid');

const route = new Router({
    prefix: '/product'
})

//owner,admin -- all
// member -- add,update,read  

route.get('/', filter, getAllProducts)
route.get('/seller', protect, isPartOfCompany, filter, getSellerProducts)
route.post('/', protect, isPartOfCompany, requiredField, isUniqProductName, isPrice, isImgUrl, createState, addProduct)
route.put('/:id', protect, isPartOfCompany, havePermission, requiredField, isUniqProductName, isImgUrl, createState, updateProduct)
route.delete('/:id', protect, isAdminOrOwner, havePermission, deleteProduct)
//socks routes
route.post('/stock', protect, isAdminOrOwner, trimData, requiredField, isValidId, isPlaceUniq, createState, addStock)
route.get('/stock/:id', protect, isPartOfCompany, getStock)
//reviews routes
route.get('/review/:id', protect, getProductReview)
route.post('/review', protect, trimData, requiredField, isValidId, canGiveReview, isRating, addReviews)

module.exports = route;