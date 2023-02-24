const Router = require('koa-router')
const { signup, login, inviteTeamMember, getTeamMembers, changePassword, forgotePasswordLink, forgotePassword, deleteUser, changeRole } = require('../controllers/userControll')
const { protect, isSeller } = require('../middlewares/userMiddl')
const { requiredField, trimData, isEmail, isPassword, isUniqMail, checkPassword, isRole, setRoleOrEmail, isAdminOrOwner, canInvite, isMailExsistOrNot, isValidForegatePasswordLink, canDelete, isUserExist } = require('../validators/userValid')

const route = new Router({
    prefix: '/user'
})

route.post('/signup', trimData, setRoleOrEmail, requiredField, isEmail, isUniqMail, isPassword, checkPassword, signup)
route.post('/login', trimData, requiredField, isEmail, isPassword, checkPassword, login)
route.patch('/changepassword', trimData, protect, isPassword, checkPassword, changePassword)
route.post('/forgotepassword', trimData, isEmail, isMailExsistOrNot, forgotePasswordLink)
route.patch('/forgotepassword/:token', isValidForegatePasswordLink, trimData, isPassword, checkPassword, forgotePassword)
route.post('/invite', protect, isAdminOrOwner, trimData, requiredField, canInvite, isRole, inviteTeamMember)
route.patch('/changerole', protect, isSeller, trimData, requiredField, isEmail, isUserExist, isRole, changeRole)
route.delete('/:id', protect, canDelete, deleteUser)
route.get('/team', protect, isSeller, getTeamMembers)

module.exports = route