const Router = require('koa-router');
const { getAllProducts, addProduct, updateProduct, deleteProduct, addReviews, getProductReview, getSellerProducts, addStock, getStock, getSingleProduct } = require('../controllers/productContoll');
const { protect, isSeller, isPartOfCompany, userHavePermission } = require('../middlewares/userMiddl');
const { isValidId } = require('../validators/cartValid');
const { isImgUrl, isUniqProductName, setSellerId, havePermission, canGiveReview, isPrice, filter, isRating, isPlaceUniq } = require('../validators/productValid');
const { createState, requiredField, isAdminOrOwner, trimData } = require('../validators/userValid');

const route = new Router({
    prefix: '/product'
})

//owner,admin -- all
// member -- add,update,read  

route.get('/', filter, getAllProducts)
route.get('/:id', getSingleProduct)
route.get('/seller', protect, isPartOfCompany, filter, getSellerProducts)
route.post('/', protect, userHavePermission, requiredField, isUniqProductName, isPrice, isImgUrl, createState, addProduct)
route.put('/:id', protect, userHavePermission, requiredField, isUniqProductName, isImgUrl, createState, updateProduct)
route.delete('/:id', protect, userHavePermission, deleteProduct)
//socks routes
route.post('/stock', protect, userHavePermission, trimData, requiredField, isValidId, createState, addStock)
route.get('/stock/:id', protect, isPartOfCompany, getStock)
//reviews routes
route.get('/review/:id', protect, getProductReview)
route.post('/review', protect, trimData, requiredField, isValidId, canGiveReview, isRating, addReviews)

module.exports = route;