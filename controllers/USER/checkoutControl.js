
const cartSchema = require("../../models/cartModel");
const productSchema = require("../../models/productModel");
const orderSchema = require("../../models/orderModel");
const addressSchema = require("../../models/addressModel");
const userSchema = require("../../models/userModel");
const couponSchema = require("../../models/couponModel");
const mongoose = require("mongoose");

const orderidGenerate = require("otp-generator");
const Razorpay = require('razorpay');

const dotEnv = require('dotenv'); dotEnv.config();

//RAZORPAY  INSTANCE  =================================================
let RzyInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
//order id generating function=========================================
function generateOrderid() {
    try {
        const orderId = orderidGenerate.generate(10, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });
        return orderId;
    } catch (error) {
        throw new Error(error)
    }
}
//gettin checkout page =================================================
const getCheckout = async (req, res) => {
    try {

        const userId = req.session.user;

        let cartProduct = await cartSchema.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: "$products" },
            {
                $lookup: {
                    from: "products",
                    localField: "products.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            }
        ]);


        // Check if the cart is empty
        if (cartProduct.length === 0) {
            return res.redirect('/cart')

        }
        let addressData = await addressSchema.findOne({ userId: userId });
        if (!addressData) {
            addressData = { addresses: [] };
        }


        let subTotal = 0;
        let mrpTotal =0;
        let offerPriceTotal = 0;

        for (let i = 0; i < cartProduct.length; i++) {
            const products = cartProduct[i].products;
            subTotal = cartProduct[i].totalCost


            const productDetails = cartProduct[i].productDetails;

            for (let j = 0; j < productDetails.length; j++) {
                const quantity = products.quantity;
                const productStock = productDetails[j].stock;
                
                mrpTotal += productDetails[j].mrp*cartProduct[i].products.quantity;
                offerPriceTotal+=  productDetails[j].offerPrice*cartProduct[i].products.quantity;
                // Check if quantity is more than product stock
                if (quantity > productStock) {
                    return res.json({ success: false, message: "Insufficient Quantity, Reduce cart Quantity" });
                }


            }
        }



        let totalPrice = 0;
        let deliveryCharge = 99;



        if (2500 > subTotal) {
            totalPrice = subTotal + deliveryCharge;
        } else {
            totalPrice = subTotal;
        }

        const couponData = await couponSchema.find(
            {
                status: true,
                minPrice: { $lt: totalPrice },
                validity: { $gt: new Date() }
            }
        )
        const totalDiscount =mrpTotal - offerPriceTotal;
        req.session.totalDiscount = totalDiscount;
        res.render("checkout", {
            success: true, message: 'Proceed to checkout',
            cartProduct,
            addressData,
            totalPrice,
            couponData,
            subTotal,
            userId,
            totalDiscount
        })


    } catch (error) {
        throw new Error(error.message);
    }
};
//save new address
const CheckoutAddress = async (req, res) => {
    try {

        try {

            userId = req.session.user;
            const { name, phone, house, locality, landmark, city, state, pincode, addressType } = req.body

            const checkUser = await addressSchema.findOne({ userId: userId })


            let result
            let address
            let saveAddress
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
            }




            if (saveAddress || result) {
                return res.status(200).json({ success: true, message: 'Address Created successfully' })
            } else {
                return res.status(400).json({ success: false, message: "created address failed" })
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server Error' })
            throw new Error(error)

        }


    } catch (error) {
        throw new Error(error.message)
    }
}


//CHECK OUT EDIT ADDRESS 
const editCheckoutAddress = async (req, res) => {
    try {
        const addressId = req.query.id;
        const userId = req.body.user

        const addressData = await addressSchema.findOne({ "addresses._id": addressId })

        let address;
        addressData.addresses.forEach(element => {
            if (addressId == element._id) {
                address = element;
            };
        })

        res.render("editCheckAdd", { address });

    } catch (error) {
        throw new Error(error)
    }
}

//save the edit address
const saveCheckoutEditedAddress = async (req, res) => {

    try {
        const addressId = req.query.id
console.log(req.query,'thsi s isquery ',req.body,'thsi si body')

        const { name, phone, house, locality, landmark, state, city, pincode, addressType } = req.body;
     


        const updateCheckoutAddress = await addressSchema.updateOne({ "addresses._id": addressId },
            {
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
            }, { new: true }
        )

        if (updateCheckoutAddress) {
            console.log(updateCheckoutAddress,'thsi is in edit address checkout')
            res.json({ success: true, message: 'Address updated successfully' })
        } else {
            res.json({ success: false, message: "Sorry updation failed" })
        }

    } catch (error) {
        throw new Error(error.message);
    }

}


//FOR APPLY COUPON

const applyCoupon = async (req, res) => {
    try {
        const { couponCode, totalPrice } = req.body;
        const userId = req.session.user;
        const uId = userId.toString()

        const couponData = await couponSchema.findOne({ couponCode: couponCode });
        if (!couponData) {
            return res.json({ success: false, message: 'coupon is not found' });

        }
        if (totalPrice < couponData.minPrice) {
            return res.json({ success: false, message: 'You are not eligible for this  coupon' })
        }

        const offerDiscount = (couponData.offer) / 100;
        const offerAmount = (offerDiscount * totalPrice);

        const maximumOfferAmt = (couponData.maxRedeemable < offerAmount) ? couponData.maxRedeemable : offerAmount;

        const totalAmount = Math.round(totalPrice - maximumOfferAmt);


        const checkUser = await couponSchema.findOne({ couponCode: couponCode, usedUser: { $in: [uId] } })

        if (checkUser) {
            return res.json({ success: false, message: 'coupon once used' })
        }
        req.session.couponDiscount = totalAmount;
        req.session.couponCode = couponCode;
        req.session.offerAmount = maximumOfferAmt;
        req.session.offer = couponData.offer;
        req.session.b4CouponPrice = totalPrice;
        const totalDiscout = req.session.totalDiscount;

        if (req.session.couponDiscount !== 0 && req.session.couponCode !== 0) {

            return res.json({ success: true, message: 'Coupon is applied', totalAmount,maximumOfferAmt,totalDiscout })
        } else {
            return res.json({ success: false, message: ' Failed to  apply Coupon' })
        }



    } catch (error) {

        throw new Error(error.message);
    }
}

//PALCE ORDER============================================================
const placeOrder = async (req, res) => {
    try {

        const { addressId, addressIndex, paymentMethod } = req.body;
        const userId = req.session.user;

        const addressData = await addressSchema.findOne({ userId: userId, "addresses._id": addressId });



        let cartData = await cartSchema.findOne({ userId: new mongoose.Types.ObjectId(userId) }).populate({
            path: 'products.productId', model: 'product',
            populate: {
                path: 'category',
                model: 'category'
            }
        });


        const items = [];
        let totalCost = cartData.totalCost;
        const newOrderId = generateOrderid();
        let quantity = cartData.quantity;
        if (!cartData) {
            return res.status(404).json({ success: false, message: "Sorry...,Cart Data Not found. Please" })
        }

        cartData.products.forEach(item => {




            const stock = item.stock;



            if (quantity <= 0) {

                return res.status(400).json({ success: false, message: "item unavailable for checkout. Please remove befor continue" })

            } else if (quantity > stock) {

                return res.status(400).json({ success: false, message: "cart quantity is higher than stock .Please reduce quantity before continue" });


            } else if (item.productId.status == false) {

                return res.status(400).json({ success: false, success: false, message: "Sorry item unavailable" })
            }
        });



        if (totalCost < 2500) {
            const delivaryCharge = 99;
            totalCost += delivaryCharge
        }



        if (paymentMethod == "COD" && (totalCost > 3000)) {

            return res.json({ success: false, message: 'please choose another payment for above 3000' })
        }

        const orderAddress = addressData.addresses[addressIndex];

        cartData.products.forEach(async (product) => {
            const price = product.productId.offerPrice ? product.productId.offerPrice : product.productId.mrp;







            const newItem = {

                image: product.productId.image,
                productName: product.productId.name,
                mrp: product.productId.mrp,
                offerPrice: price,
                offer: product.productId.offer,
                category: product.productId.category.categoryName,
                cartQuantity: product.quantity,
                productId: product.productId,
                Reason: null,
            };


            items.push(newItem);
        });




        let endPrice = (req.session?.couponDiscount && req.session?.couponDiscount !== 0) ? req.session?.couponDiscount : totalCost;


        const newOrder = new orderSchema({
            userId: userId,
            orderId: "OD" + newOrderId,
            totalPrice: endPrice,
            couponClaim: req.session?.offerAmount,
            couponOffer: req.session?.offer,
            paymentMethod: paymentMethod,
            orderedItems: items,
            address: orderAddress,


        });

        if ((req.session?.couponDiscount && req.session?.couponDiscount !== 0)) {
            const userId = req.session.user;
            const uId = userId.toString()
            const couponCode = req.session.couponCode;

            const couponCheck = await couponSchema.findOne({ couponCode: couponCode });

            if (!couponCheck) {
                return res.json({ success: true, message: 'Coupon not found' })
            }

            const discountAmout = (couponCheck?.offer / 100) * endPrice;
            const maximumOfferAmt = (couponCheck?.maxRedeemable < discountAmout) ? couponCheck?.maxRedeemable : discountAmout;

            const endCost = Math.round(totalCost - maximumOfferAmt);


            const couponUser = await couponSchema.updateOne({ couponCode: req.session.couponCode }, { $push: { usedUser: uId } });

            if (endCost !== req.session?.couponDiscount) {
                return res.json({ success: false, message: 'price manipulation found' })
            }


        }

        let savedOrder = await newOrder.save();


        const totalAmount = savedOrder.totalPrice;
        const orderId = savedOrder._id;




        if (savedOrder) {
            for (const product of cartData.products) {

                const prodId = product.productId._id;
                const stock = product.productId.stock;
                const quantity = product.quantity;


                const checkStock = await productSchema.findById(prodId)

                if (checkStock && checkStock.stock - quantity >= 0) {
                    checkStock.stock -= quantity;
                    await checkStock.save();


                }

            }

            if (req.session.couponDiscount || req.session.couponCode || req.session.offerAmount || req.session.offer) {
                delete req.session.couponDiscount;
                delete req.session.couponCode;
                delete req.session.offerAmount;
                delete req.session.offer;
            }

        } else {
            return res.json({ success: false, message: 'order failed' })

        }

        //cashon delivary
        if (paymentMethod == "COD") {


            const deleteCart = await cartSchema.findOneAndDelete({ userId: new mongoose.Types.ObjectId(userId) });

            return res.json({ success: true, message: "order successfull" })
        }
        //razorpay
        if (paymentMethod == "Razorpay") {


            const options = {
                amount: totalAmount * 100,
                currency: "INR",
                receipt: orderId,
                payment_capture: "1",
            };
            await cartSchema.findOneAndDelete({ userId: new mongoose.Types.ObjectId(userId) });
            const razorpayOrder = RzyInstance.orders.create(options)
            return res.json({
                success: true,
                message: "Order Success, Ready for payment",
                key_id: process.env.RAZORPAY_KEY_ID,
                orderId: orderId,
                currency: "INR",
                amount: totalAmount * 100,
                razorpayOrderId: razorpayOrder._id,
            });

        }

    } catch (error) {
        throw new Error(error)

    }
}


//  VERIFY PAYMENT 
const verifyPayment = async (req, res) => {
    try {
        // const userId = req.session.user;
        const { rzy_orderId, rzy_paymentId, orderId, signature } = req.body;


        let orderData = await orderSchema.findOneAndUpdate({ _id: orderId }, { $set: { paymentStatus: "Paid", rpyPaymentId: rzy_paymentId } })


        if (orderData) {

            return res.json({ success: true, message: "Payment Verified ,Order successfull" })
        } else {

            const orderData = await orderSchema.updateMany({ _id: orderId }, { $set: { paymentStatus: "Failed" } })


            return res.json({ success: false, message: "Payment  Failed" })
        }



    } catch (error) {
        throw new Error(error.message);

    }
}
// DELETE COUPON 

const deleteCoupon = async (req, res) => {
    try {

        delete req.session.couponDiscount;
        delete req.session.couponCode;
        delete req.session.offerAmount;
        delete req.session.offer;
        res.json({ success: true, message: 'coupon removed successfully', b4CouponPrice: req.session.b4CouponPrice,discuntAmt:req.session.totalDiscount  });
    } catch (error) {
        throw new Error(error.message);
    }
}

//orderSuccess======================================== 

const orderSuccess = async (req, res) => {
    try {

        res.render("orderSuccess")
    } catch (error) {
        throw new Error(error.message)
    }
}
const paymentFailed = async (req, res) => {
    try {

        res.render("paymentFailed")
    } catch (error) {
        throw new Error(error.message)
    }
}


module.exports = {
    getCheckout,
    CheckoutAddress,
    editCheckoutAddress,
    saveCheckoutEditedAddress,
    placeOrder,
    orderSuccess,
    paymentFailed,
    verifyPayment,
    applyCoupon,
    deleteCoupon,


}