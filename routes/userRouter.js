const express =require("express");
const router = express.Router();
const UserController =require("../controllers/USER/authController");
const auth = require("../middleware/userAuth")
const passport = require("passport");
const googleAuth = require("../config/googleAuth");
const homeControl = require("../controllers/USER/homeControl");
const session = require("express-session");
const profileControll = require("../controllers/USER/userProfile");
const cartControl = require("../controllers/USER/cartControll");
const checkoutControl = require("../controllers/USER/checkoutControl");
const wishlistController = require("../controllers/USER/wihslistController");
//load Home

router.get("/",homeControl?.getHome); 
router.get("/logout",UserController?.userLogout);
//===================authenticatoin==========================

router.get("/signup",auth.ifUser,UserController?.getSignup);
router.post("/signup",UserController?.postSignup);

router.get("/login",auth.ifUser,UserController?.getLogin);
router.post("/login",UserController?.postLogin);

//signup with google
router.get("/google",passport.authenticate('google',{scope:['email','profile']}));
router.get("/google/callback",passport.authenticate('google',{
    successRedirect:'/google/success',
    failureRedirect:'/login',
}))
router.get('/google/success',UserController?.googleAuth)
//==================password related========================
router.get("/forget-Pass",UserController?.getForgetpass);
router.post("/forget-Pass",UserController?.postForgetpass);

router.get("/change-pass",auth.ifUser,UserController?.getChangePass);
router.post("/change-pass",UserController?.postChangePass);

router.get('/forgetPass/otp',auth.ifUser,UserController?.getForgetOtp);
router.post("/forgetPass/otp",UserController?.postForgetOtp);
router.get("/resend",UserController?.resendOtp);
//==================verifyOtp================================ 

router.get(`/verify-otp`,auth.ifUser,UserController?.getOtpVerify);
router.post("/verify-otp",UserController?.postOtpVerify);

//shop=================================================
router.get('/product',homeControl?.getViewProduct);
router.post('/addToCart',homeControl?.addToCart);

router.get('/shop',homeControl?.getAllProduct);

//USER PROFILE=====================================================
router.get("/user/profile",auth.userCheck,profileControll?.userProfile);
router.put("/user/profile",profileControll?.chngeUserData);
 
router.get('/user/address',auth.userCheck,profileControll?.getAddress);
router.get('/user/changePass',auth.userCheck,profileControll?.getChangePass); 
router.patch('/user/changePass',auth.userCheck,profileControll?.changePass);
router.get('/user/addAddress',auth.userCheck,profileControll?.getAddAddress);
router.delete("/user/deleteAddress",auth.userCheck,profileControll?.deleteAddress); 
router.post('/user/addAddress',auth.userCheck,profileControll?.postAddAddress) ;
router.get("/user/editAddress",auth.userCheck,profileControll?.getEditAddress);
router.post('/user/editAddress',auth.userCheck,profileControll?.editAddress); 

router.get("/user/order",auth.userCheck,profileControll?.getOrders);
router.get("/user/order/orderDetails",auth.userCheck,profileControll?.orderDetails);
router.get("/user/order/orderDetails/invoice",auth.userCheck,profileControll?.getInvoice);
router.post('/retryPayment',auth.userCheck,profileControll?.retryPayment) 
router.post('/verify-Retry-Payment',auth.userCheck,profileControll?.verifyRetryPayment);
router.get("/user/wallet",auth.userCheck,profileControll?.getWallet);
router.post('/user/wallet/add-money',auth.userCheck,profileControll?.addMoney);
router.post('/user/wallet/verify-add-money',auth.userCheck,profileControll?.verifyAddMoney);

 router.get("/cart",auth.userCheck,cartControl?.getCart);
 router.delete('/cart/remove',auth.userCheck,cartControl?.cartRemove);
 router .post("/cart/increment",auth.userCheck,cartControl?.incrementQty);
 router.post('/cart/decrement',auth.userCheck,cartControl?.decrementQty);
router.post('/cart/check',auth.userCheck,cartControl?.cartCondition);

 // order controll
 router.get("/checkout",auth.userCheck,checkoutControl?.getCheckout);
 router.post("/checkout/addAddress",auth.userCheck,checkoutControl?.CheckoutAddress);
 router.get("/checkout/editAddress",auth.userCheck,checkoutControl?.editCheckoutAddress);
 router.put("/checkout/editAddress",auth.userCheck,checkoutControl?.saveCheckoutEditedAddress);
 router.post("/checkout/apply-coupon",auth.userCheck,checkoutControl?.applyCoupon);
 router.get("/checkout/remove-Coupon",auth.userCheck,checkoutControl?.deleteCoupon);

 router.post("/placeOrder",auth.userCheck,checkoutControl?.placeOrder) ;
 router.post('/verifyPayment',auth.userCheck,checkoutControl?.verifyPayment);
 router.get("/order-success",auth.userCheck,checkoutControl?.orderSuccess);
 router.get("/payment-failed",auth.userCheck,checkoutControl?.paymentFailed);
router.post('/order/cancel-order',auth.userCheck,profileControll?.cancelOrder);
router.post("/order/return-order",auth.userCheck,profileControll?.returnOrder);


router.get("/wishlist",auth.userCheck,wishlistController?.getWishlist);
router.post("/add-wishlist",auth.userCheck,wishlistController?.addToWishlist);
router.delete('/wishlist/remove',auth.userCheck,wishlistController?.removeFromWishlist);
router.put('/wishlist/addCart',auth.userCheck,wishlistController?.wishlitstToCart);



module.exports = router ;
        
 