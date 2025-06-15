'use strict'
const express =require("express");
const upload = require("../middleware/multer");
const ad_router = express.Router();
const adminControl = require("../controllers/ADMIN/adminController")
const auth = require("../middleware/adminAuth")
const categoryControl =require("../controllers/ADMIN/categoryControl");
const productControl = require("../controllers/ADMIN/productControl")
const { googleAuth } = require("../controllers/USER/authController");
const orderControll = require("../controllers/ADMIN/orderController")
const  couponControll = require("../controllers/ADMIN/couponController") 
const  offerControll = require("../controllers/ADMIN/offerController") ;
const  salesRepoartControl = require("../controllers/ADMIN/salesRepoartControl") 

//ADMIN LOGIN ROUTE===================================
ad_router.get("/admin/login",auth.ifAdmin,adminControl.getAdminLogin);
ad_router.post("/admin/login",adminControl.postAdminLogin);
//ADMIN LOGIN ROUTE=============================================
ad_router.get("/admin/logout",adminControl.adminLogout);  
//ADMIN DASHBORD ROUTE==========================================
ad_router.get("/admin/dashboard",auth.ifNoAdmin,adminControl.getDashboard);

//USER DETAILES=================================================
ad_router.get("/admin/user",auth.ifNoAdmin,adminControl.getUsers);
ad_router.patch("/admin/user-block/:id",auth.ifNoAdmin,adminControl.blockUser);
ad_router.patch("/admin/user-unblock/:id",auth.ifNoAdmin,adminControl.unblockUser);
ad_router.get("/admin/userSearch",auth.ifNoAdmin,adminControl.userSearch);


//PRODUCT DETAILES==============================================
ad_router.get("/admin/product",auth.ifNoAdmin,productControl.getProduct);
ad_router.get("/admin/add-product",auth.ifNoAdmin,productControl.getCreateProduct)
ad_router.post("/admin/add-product",upload.any(),productControl.createProduct);
ad_router.patch('/admin/product-list/:id',auth.ifNoAdmin,productControl.productList);
ad_router.patch('/admin/product-unlist/:id',auth.ifNoAdmin,productControl.productUnlist); 
ad_router.get('/admin/edit-product/:id',auth.ifNoAdmin,productControl.getEditProduct);
ad_router.put('/admin/edit-product/:prodId',auth.ifNoAdmin, productControl.editProduct);
ad_router.post('/admin/save-edit-image/:prodId',upload.any(), productControl.uploadImage);
ad_router.delete('/admin/edit-product/deleteImage',auth.ifNoAdmin,productControl.deleteImage);
ad_router.delete("/admin/delete-product",auth.ifNoAdmin,productControl.deleteProduct);
ad_router.get("/admin/productSearch",auth.ifNoAdmin,productControl.productSearch);
//CATEGORY DETAILES==============================================
ad_router.get("/admin/category",auth.ifNoAdmin,categoryControl.getCategory);
ad_router.post("/admin/add-category",auth.ifNoAdmin,categoryControl.addCategory);
ad_router.patch('/admin/unlist-category/:id',auth.ifNoAdmin, categoryControl.unlistCategory);
ad_router.patch('/admin/list-category/:id',auth.ifNoAdmin,categoryControl.listCategory);
ad_router.patch("/admin/edit-category",auth.ifNoAdmin,categoryControl.editCategory);
ad_router.get("/admin/delete-category/:id",auth.ifNoAdmin,categoryControl.deleteCategory);
ad_router.get("/admin/categorySearch",auth.ifNoAdmin,categoryControl.categSearch);

//ADMIN ORDER CONTROLLER  
ad_router.get("/admin/orderMgt",auth.ifNoAdmin,orderControll.getOrders);
ad_router.get("/admin/orderMgt/orderDetails",auth.ifNoAdmin,orderControll.adminOrderDetails);
ad_router.patch("/admin/order/change-order-status",auth.ifNoAdmin,orderControll.changeOrderStatus);
ad_router.patch("/admin/order/decline-return",auth.ifNoAdmin,orderControll.declineReturn);
ad_router.post("/admin/order/approve-return",auth.ifNoAdmin,orderControll.approveReturn);

//ADMIN COUPONS CONTROLLER
ad_router.get("/admin/couponMangement",auth.ifNoAdmin,couponControll.getCoupon);
ad_router.post('/admin/add-coupon',auth.ifNoAdmin,couponControll.addCoupon);
ad_router.patch('/admin/status-coupon',auth.ifNoAdmin,couponControll.couponStatus);
ad_router.delete('/admin/delete-coupon',auth.ifNoAdmin,couponControll.deleteCoupon);


//ADMIN OFFER ROUTES
ad_router.get('/admin/category-offers',auth.ifNoAdmin,offerControll.getCategoryOffer);
 ad_router.post('/admin/add-category-offers',auth.ifNoAdmin,offerControll.addcategoryOffer);
 ad_router.delete('/admin/delete-category-offer',auth.ifNoAdmin,offerControll.deleteCategoryOffer)
 ad_router.put('/admin/edit-category-offer',auth.ifNoAdmin,offerControll.editCategoryOffer)

ad_router.get('/admin/product-offers',auth.ifNoAdmin,offerControll.getProductOffer);
ad_router.post('/admin/add-product-offers',auth.ifNoAdmin,offerControll.addProductOffer);
ad_router.delete('/admin/delete-product-offer',auth.ifNoAdmin,offerControll.productOfferDelete);
ad_router.put('/admin/edit-product-offer',auth.ifNoAdmin,offerControll.editProductOffer);
//SALES REPOART

ad_router.get('/admin/sales-report',auth.ifNoAdmin,salesRepoartControl.getSalesPage);


module.exports = ad_router; 