const userSchema = require("../../models/userModel");
const addressSchema = require('../../models/addressModel');
const orderSchema = require("../../models/orderModel");
const productSchema = require("../../models/productModel");
const walletSchema = require("../../models/walletModel");
const couponSchema = require('../../models/couponModel');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { json } = require("express");
const Razorpay = require('razorpay');
const dotEnv = require('dotenv'); dotEnv.config();


const idGenerate = require("otp-generator");

//order id generating function=========================================
function generateOrderid() {
    try {
        const orderId = idGenerate.generate(10, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });
        return orderId;
    } catch (error) {
        throw new Error(error)
    }
}

//RAZORPAY INSTANCE

const rpyInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


//GLOBAL VARIABLE
let userId

//GET USER PROFILE ================================================
const userProfile = async (req, res) => {
    try {
        userId = req.session.user;

        const userData = await userSchema.findById(userId);

        return res.render("userProfile", { userData, userId });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
        throw new Error(error);

    }
}
//POST USER DATA ===================================================
const chngeUserData = async (req, res, next) => {
    try {

        const { name, phone } = req.body;

        userId = req.session.user;

        const userData = await userSchema.findOne({ _id: userId })
        if (userData) {
            if (userData.name == name && userData.phone == phone) {
                return res.json({ success: false, message: 'save after only made changes changes' })
            }
        }
        const updateData = await userSchema.findByIdAndUpdate(
            userId,
            {
                $set: {
                    name: name,
                    phone: phone,
                },
            },
            { new: true });

        if (updateData) {

            return res.status(200).json({ success: true, message: "Profile updated" })
        } else {

            return res.status(404).json({ success: false, message: "updation failed" })
        };



    } catch (error) {

        console.log(error.message);
        next(error)

    }
}
//GET CHANGE PASS================================================
const getChangePass = async (req, res, next) => {
    try {
        userId = req.session.user

        res.render("passManage", { userId });
    } catch (error) {

        console.log(error.message);
        next(error)
    }
}
//PATCH  CHANGE PASSWORD==============================================
const changePass = async (req, res, next) => {
    try {
        const { password, password1, password2 } = req.body;
        userId = req.session.user;

        const userData = await userSchema.findById(userId);

        const passMatch = await bcrypt.compare(password, userData.password)
        if (!passMatch) {
            return res.status(400).json({ success: false, message: "current password is not matching with old one" })
        } else if (password1 !== password2) {
            return res.status(400).json({ success: false, message: "New password is not matching" })

        }

        const hashPass1 = await bcrypt.hash(password1, 10);
        const passUpdated = await userSchema.findByIdAndUpdate(userId, { $set: { password: hashPass1 } })
        if (passUpdated) {
            return res.status(200).json({ success: true, message: 'password updated successfully' })
        } else {
            return res.status(400).json({ success: false, message: "sorry try again" })
        }

    } catch (error) {
        console.log(error.message);
        next(error)

    }
}
// GET ADDRESS PAGE====================================================
const getAddress = async (req, res, next) => {
    try {
        userId = req.session.user;

        const userData = await userSchema.findById(userId)
        let addressData = await addressSchema.findOne({ userId: userId });


        if (!addressData) {
            addressData = { addresses: [] };

        }
        res.render('userAddress', { userData, addressData, userId })

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}
//ADD ADDRESS=======================================================
const getAddAddress = async (req, res, next) => {
    try {
        userId = req.session.user
        const userData = await userSchema.findById(userId)


        res.render('addAddress', { userData, userId })

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}
//POST ADDRESS =====================================================
const postAddAddress = async (req, res, next) => {
    try {

        userId = req.session.user;
        console.log(userId, 'ldfk', req.session.user)
        const { name, phone, house, locality, landmark, city, state, pincode, addressType } = req.body
        console.log(name, phone, house, locality, landmark, city, state, pincode, addressType)

        const checkUser = await addressSchema.findOne({ userId: new mongoose.Types.ObjectId(userId) });
        console.log(checkUser, 'thiss is checkuser');
        if (checkUser?.addresses?.length >= 4) {

            return res.json({ success: false, message: "user can only store 4 addresses" })
        }


        let result;
        let address;
        let saveAddress;
        if (!checkUser) {

            address = new addressSchema({
                userId: userId,
                addresses: [{
                    name: name,
                    phone: phone,
                    house: house,
                    locality: locality,
                    city: city,
                    landmark: landmark,
                    state: state,
                    pincode: pincode,
                    addressType: addressType

                }]
            })
            saveAddress = await address.save();
        } else {

            result = await addressSchema.updateOne(
                { userId: userId },
                {
                    $push: {
                        addresses: {
                            name: name,
                            phone: phone,
                            house: house,
                            locality: locality,
                            city: city,
                            landmark: landmark,
                            state: state,
                            pincode: pincode,
                            addressType: addressType
                        }
                    }
                }
            );





            if (saveAddress || result) {
                return res.status(200).json({ success: true, message: 'Address Created successfully' })
            } else {
                return res.status(400).json({ success: false, message: "created address failed" })
            }
        }




    } catch (error) {
        console.log(error.message);
        next(error)

    }
}
//EDIT ADDRESS=============================================
const getEditAddress = async (req, res, next) => {
    try {
        let address
        userId = req.session.user
        const addressId = req.query.id;
        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.render("/user/address")
        }
        const userData = await userSchema.findOne({ _id: userId })

        const addressData = await addressSchema.findOne({ "addresses._id": addressId })

        addressData.addresses.forEach(element => {
            if (addressId == element._id) {
                address = element
            }
        })
        res.render('editAddress', { userData, address, userId })
    } catch (error) {
        console.log(error.message);
        next(error)
    }
}
//EDIT ADDRESS ==============================================
const editAddress = async (req, res, next) => {
    try {
        const addressId = req.query.addressId;
        console.log(addressId, 'this si editadd id', req.body)

        const { name, phone, house, locality, landmark, city, state, pincode, addressType } = req.body;


        const updateAddress = await addressSchema.updateOne({ "addresses._id": addressId }, {
            $set: {
                'addresses.$.name': name,
                'addresses.$.phone': phone,
                'addresses.$.house': house,
                'addresses.$.locality': locality,
                'addresses.$.city': city,
                'addresses.$.landmark': landmark,
                'addresses.$.state': state,
                'addresses.$.pincode': pincode,
                'addresses.$.addressType': addressType,

            }
        })
        console.log(updateAddress, 'this is update address')
        if (updateAddress.modifiedCount > 0) {
            res.status(200).json({ success: true, message: 'Address updated successfully' });
        } else {
            res.json({ success: false, message: " Sorry updation failed" });
        }
    } catch (error) {
        console.log(error.message);
        next(error)
    }
}
//DELETE PRODUCTS=============================================
const deleteAddress = async (req, res, next) => {
    try {
        addressId = req.body.id
        const userId = req.session.user;

        const delAddress = await addressSchema.updateOne({ userId: userId }, { $pull: { addresses: { _id: addressId } } })

        if (delAddress) {
            return res.status(200).json({ success: true, message: 'Address deleted successfuly' })
        } else {
            return res.status(400).json({ success: false, message: 'Deletion failed try again' })
        }

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}
//GET ORDERS

const getOrders = async (req, res, next) => {

    try {
        const userId = req.session.user;
        const user = await userSchema.findOne({ _id: userId })
        if (!user) {
            redirect("/logout")
        }
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const totalOrders = await orderSchema.countDocuments({ userId: userId });
        const totalPages = Math.ceil(totalOrders / limit);

        const orderData = await orderSchema.find({ userId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);


        res.render('orders', { user, orderData, userId, currentPage: page, totalPages, });



    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

// VIEW ORDER DETAILES ==============================
const orderDetails = async (req, res, next) => {
    try {

        const userId = req.session.user;
        const orderId = req.query.orderId;
        

        const userData = await userSchema.findOne({ _id: userId });


        if (!userData) {

            // res.redirect("/logout");

        } else {

            const orderData = await orderSchema.find({ userId: userId, orderId: orderId });

            res.render("orderDetails", { orderData, userData })

        }

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

//user cancel order
const cancelOrder = async (req, res, next) => {
    try {
        const userId = req.session.user;
        const { productId, cancellationReason, orderId } = req.body;

        const updateOrder = await orderSchema.findOneAndUpdate(
            {
                orderId: orderId,
                "orderedItems.productId": new mongoose.Types.ObjectId(productId)

            },
            {
                $set: {
                    "orderedItems.$.orderStatus": "Cancelled",
                    "orderedItems.$.Reason": cancellationReason
                }
            },
            { new: true }

        );



        if (!updateOrder) {
            return res.json({ success: false, message: 'Order not found or update failed' });
        }

        const cancelledProduct = updateOrder.orderedItems.find(item => item.productId.toString() === productId);

        const cancelledQuantity = parseInt(cancelledProduct.cartQuantity)


        if (!cancelledProduct) {

            return res.json({ success: false, message: 'Cancelled product not found in order' });
        }

        if (updateOrder.paymentMethod == 'Razorpay') {
            const walletData = await walletSchema.findOne({ userId: userId });


            const productPrice = (cancelledProduct.offerPrice ? cancelledProduct.offerPrice : cancelledProduct.mrp) * cancelledProduct.cartQuantity;

            let totalPrice = updateOrder.totalPrice;
            totalPrice = (totalPrice < 2500) ? (totalPrice - 99) : totalPrice;


            let discountAmount = (updateOrder?.couponClaim && updateOrder?.couponOffer) ? updateOrder?.couponClaim : 0


            const productQuantity = updateOrder?.orderedItems.reduce((total, item) => total + item?.cartQuantity, 0)


            let refundAmount = 0;
            if (updateOrder?.couponClaim && updateOrder?.couponOffer) {
                const couponAmount = (updateOrder?.couponClaim) / productQuantity;
                refundAmount = productPrice - couponAmount;

            } else {
                refundAmount = productPrice;
            }






            if (walletData) {

                const newWallet = await walletSchema.updateOne({ userId: new mongoose.Types.ObjectId(userId) },
                    {
                        $inc: { balance: refundAmount },
                        $push: { history: { createTime: new Date(), amount: refundAmount, transactionType: "Credit", discription: "Cancelled product Amount Credited" } }
                    });

                if (newWallet.modifiedCount > 0) {
                    const orderData = await orderSchema.updateOne({ orderId: orderId }, { $set: { paymentStatus: "Refunded" } })

                }

            } else {
                const saveWallet = new walletSchema(
                    {
                        userId: userId,
                        balance: refundAmount,
                        history: [{
                            createTime: new Date(),
                            amount: refundAmount,
                            transactionType: "Credit",
                            discription: "Cancelled product Amount Credited",
                        }]
                    },

                )
                const newWalletSaved = await saveWallet.save()
                if (newWalletSaved) {
                    const orderData = await orderSchema.updateMany({ orderId: orderId }, { $set: { paymentStatus: "Refunded" } })

                }

            }


        }


        //product stock updating
        const stockUpdate = await productSchema.updateOne({ _id: productId }, { $inc: { stock: cancelledQuantity } }, { new: true })



        if (stockUpdate.modifiedCount > 0) {
            res.json({ success: true, message: 'Order cancelled' })
        } else {
            res.json({ success: false, message: 'Order cancel failed' })
        }
    } catch (error) {
        console.log(error.message);
        next(error)

    }
}

//RETURN ORDER ==================================
const returnOrder = async (req, res, next) => {
    try {

        const { orderId, productId, reason } = req.body;

        const orders = await orderSchema.updateOne(
            {
                "orderedItems.productId": productId,
                orderId: orderId,

            },
            {
                $set: {
                    "orderedItems.$.returnApprove": 1,
                    "orderedItems.$.Reason": reason
                }
            },
            {

                new: true
            }
        )



        if (orders.modifiedCount > 0) {
            res.json({ success: true, message: "Return Requested" });
        } else {
            res.json({ success: false, message: 'Try again' });

        }

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

//RAZORPAY REPAYMENT 
const retryPayment = async (req, res, next) => {
    try {

        const { totalCost, orderId } = req.body;

        const options = {
            amount: totalCost * 100,
            currency: "INR",
            receipt: orderId,
            payment_capture: "1",
        };
        const razorpayOrder = rpyInstance.orders.create(options, function (err, order) {

        });
        return res.status(200).json({
            success: true,

            key_id: process.env.RAZORPAY_KEY_ID,
            orderId: orderId,
            currency: "INR",
            amount: totalCost * 100,
            razorpayOrderId: razorpayOrder._id,
        });


    } catch (error) {
        console.log(error.message);
        next(error)

    }
}

//RETRY PAYMENT VERIFY
const verifyRetryPayment = async (req, res, next) => {
    try {
        const { rpyPaymentId, orderId } = req.body;

        let orderData = await orderSchema.updateOne({ _id: orderId }, { $set: { paymentStatus: "Paid", rpyPaymentId: rpyPaymentId } }, { new: true })

        if (orderData.modifiedCount > 0) {
            return res.json({ success: true, message: 'Payment Successfull' })
        } else {
            return res.json({ success: false, message: 'Payment failed' })
        }
    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

//GET WALLET 
const getWallet = async (req, res, next) => {
    try {
        const userId = req.session.user;

        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;
        const aggregationPipeline = [
            { $match: { userId: new mongoose.Types.ObjectId(userId) } }, // Match documents for the specific userId
            { $unwind: "$history" }, // Unwind the history array
            { $sort: { "history.createTime": -1 } }, // Sort history by createTime descending
            { $group: { _id: '$id', count: { $sum: 1 } } }


        ];
        const totalCountResult = await walletSchema.aggregate(aggregationPipeline).exec();

        const totalCount = totalCountResult.length > 0 ? totalCountResult[0].count : 0;

        const totalPage = Math.ceil(totalCount / limit);


        const walletAggregate = [
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: "$history" },
            { $sort: { "history.createTime": -1 } },
            { $skip: skip },
            { $limit: limit }
        ];
        const walletData = await walletSchema.aggregate(walletAggregate).exec();

        return res.render('wallet', { walletData, totalPage, currentPage: page });

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}
//ADD MONEY TO WALLET 
const addMoney = async (req, res, next) => {
    try {
        const { amount } = req.body;
        const userId = req.session.user;

        const walletData = {
            userId: userId,
            balance: Number(amount),
            history: [{
                createTime: new Date(),
                amount: Number(amount),
                transactionType: "Credit",
                discription: 'Wallet Top Up',
            }]
        }
        req.session.wallet = walletData;
        if (!amount || amount == '' || amount == null) {
            return res.json({ success: false, message: 'please enter an amount' })
        }

        const orderId = generateOrderid();

        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: orderId,
            payment_capture: 1,
        }


        const razorpayOrder = rpyInstance.orders.create(options, function (err, order) {

        });
        return res.status(200).json({
            success: true,
            key_id: process.env.RAZORPAY_KEY_ID,
            orderId: orderId,
            currency: "INR",
            amount: amount * 100,
            razorpayOrderId: razorpayOrder._id,
        })
    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

//RETRY PAYMENT VERIFY
const verifyAddMoney = async (req, res, next) => {
    try {
        const { rzy_paymentId, } = req.body;
        const wallet = req.session.wallet;

        if (wallet && rzy_paymentId) {

            const existingWallet = await walletSchema.findOne({ userId: wallet.userId });

            if (existingWallet) {

                existingWallet.balance += wallet.balance;
                existingWallet.history.push(...wallet.history);
                const saveExistWallet = await existingWallet.save();

                delete req.session.wallet;
                return res.json({ success: true, message: 'Payment Successfull, money credited to your wallet' })
            } else {
                const newWallet = new walletSchema(wallet);
                const saveNewWallet = await newWallet.save();

                delete req.session.walletData;
                return res.json({ success: true, message: 'Payment Successfull, money credited to your wallet' })
            }


        } else {
            return res.json({ success: false, message: 'Wallet not found' })
        }
    } catch (error) {
        console.log(error.message);
        next(error)
    }
}
//  GET INVOICE====================
const getInvoice = async (req, res, next) => {
    try {
        const { orderId } = req.query
        const generateId = generateOrderid();
        const invoiceId = "INV" + generateId;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.redirect('/user/order')
        }
        const orderData = await orderSchema.findOne(

            { _id: new mongoose.Types.ObjectId(orderId) },

        );
        const delivered = await orderSchema.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
            { $unwind: "$orderedItems" },
            { $match: { "orderedItems.orderStatus": "Delivered" } },
            {
                $group: {
                    _id: "$_id",
                    orderId: { $first: "$_id" },
                    orderedItems: { $push: "$orderedItems" },

                }
            }
        ]);



        let totalSum = 0;

        const CalcAmt = delivered.forEach(item => {

            item.orderedItems.forEach(items => {
                totalSum += Number(items.offerPrice)

            })
        })



        res.render('invoice', { invoiceId, orderData, delivered, totalSum });
    } catch (error) {
        console.log(error.message);
        next(error)
    }
}
module.exports = {
    userProfile,
    chngeUserData,

    getAddress,
    deleteAddress,

    getChangePass,
    changePass,

    getAddAddress,
    postAddAddress,
    getEditAddress,
    editAddress,

    getOrders,
    orderDetails,
    cancelOrder,
    returnOrder,


    verifyRetryPayment,
    retryPayment,

    getWallet,
    addMoney,
    verifyAddMoney,

    getInvoice,

}