const cartSchema = require("../../models/cartModel");
const productSchema = require("../../models/productModel");
const orderSchema = require("../../models/orderModel");
const addressSchema = require("../../models/addressModel");
const userSchema = require("../../models/userModel");
const couponSchema = require("../../models/couponModel");
const walletSchema = require("../../models/walletModel");
const mongoose = require("mongoose");
const orderidGenerate = require("otp-generator");
const Razorpay = require("razorpay");
const dotEnv = require("dotenv");
const crypto = require("crypto");

dotEnv.config();

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
    console.log(error.message);
  }
}
//gettin checkout page =================================================
const getCheckout = async (req, res, next) => {
  try {
    const userId = req.session.user ?? req.cookies.user;

    let cartProduct = await cartSchema.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(
            typeof userId == "string" ? userId : String(userId)
          ),
        },
      },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
    ]);

    // Check if the cart is empty
    if (cartProduct.length === 0) {
      return res.redirect("/cart");
    }
    let addressData = await addressSchema.findOne({ userId });
    if (!addressData) {
      addressData = { addresses: [] };
    }

    let subTotal = 0;
    let mrpTotal = 0;
    let offerPriceTotal = 0;
    let totalOfferPrice = 0;

    for (let i = 0; i < cartProduct.length; i++) {
      const products = cartProduct[i]?.products;
      const productDetails = cartProduct[i]?.productDetails;
      const quantity = products?.quantity ?? 1;
      subTotal = cartProduct[i]?.totalCost ?? 0;
      for (let j = 0; j < productDetails.length; j++) {
        const mrp = productDetails[j]?.mrp ?? 0;
        const offerPrice = productDetails[j]?.offerPrice;
        const productStock = productDetails[j]?.stock ?? 0;
        console.log(mrp, "=>", offerPrice);

        if (quantity > productStock) {
          return res.json({
            success: false,
            message: "Insufficient Quantity, Reduce cart Quantity",
          });
        }

        mrpTotal += offerPrice ? offerPrice * quantity : mrp * quantity;
        // mrp * quantity;

        // ✅ Only apply discount if offerPrice exists and is less than MRP
        if (offerPrice != null && offerPrice < mrp) {
          totalOfferPrice += (mrp - offerPrice) * quantity;
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

    const couponData = await couponSchema.find({
      status: true,
      minPrice: { $lt: totalPrice },
      validity: { $gt: new Date() },
    });

    const totalDiscount = totalOfferPrice;
    //  mrpTotal - (offerPriceTotal ? offerPriceTotal : 0);

    req.session.totalDiscount = totalDiscount;
    console.log(totalDiscount, "this is the discount");
    res.render("checkout", {
      success: true,
      message: "Proceed to checkout",
      cartProduct,
      addressData,
      totalPrice,
      couponData,
      subTotal,
      userId,
      totalDiscount,
    });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
//save new address
const CheckoutAddress = async (req, res, next) => {
  try {
    const userId = req.session.user ?? req.cookies.user;
    const {
      name,
      phone,
      house,
      locality,
      landmark,
      city,
      state,
      pincode,
      addressType,
    } = req.body;
    console.log(
      name,
      phone,
      house,
      locality,
      landmark,
      city,
      state,
      pincode,
      addressType
    );
    const checkUser = await addressSchema.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    let result;
    // let address
    let saveAddress;
    if (checkUser) {
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
              addressType: addressType,
            },
          },
        }
      );
    } else {
      const address = new addressSchema({
        userId: userId,
        addresses: [
          {
            name: name,
            phone: phone,
            house: house,
            locality: locality,
            city: city,
            landmark: landmark,
            state: state,
            pincode: pincode,
            addressType: addressType,
          },
        ],
      });
      saveAddress = await address.save();
    }
    if (saveAddress || result) {
      return res.json({
        success: true,
        message: "Address Created successfully",
      });
    } else {
      return res.json({ success: false, message: "created address failed" });
    }
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
//CHECK OUT EDIT ADDRESS
const editCheckoutAddress = async (req, res, next) => {
  try {
    const addressId = req.query.id;
    const userId = req.body.user;

    const addressData = await addressSchema.findOne({
      "addresses._id": addressId,
    });

    let address;
    addressData.addresses.forEach((element) => {
      if (addressId == element._id) {
        address = element;
      }
    });

    res.render("editCheckAdd", { address });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

//save the edit address
const saveCheckoutEditedAddress = async (req, res, next) => {
  try {
    const addressId = req.query.id;
    console.log(req.query, "thsi s isquery ", req.body, "thsi si body");

    const {
      name,
      phone,
      house,
      locality,
      landmark,
      state,
      city,
      pincode,
      addressType,
    } = req.body;

    const updateCheckoutAddress = await addressSchema.updateOne(
      { "addresses._id": addressId },
      {
        $set: {
          "addresses.$.name": name,
          "addresses.$.phone": phone,
          "addresses.$.house": house,
          "addresses.$.locality": locality,
          "addresses.$.city": city,
          "addresses.$.landmark": landmark,
          "addresses.$.state": state,
          "addresses.$.pincode": pincode,
          "addresses.$.addressType": addressType,
        },
      }
    );

    if (updateCheckoutAddress.modifiedCount > 0) {
      console.log(updateCheckoutAddress, "thsi is in edit address checkout");
      res.json({ success: true, message: "Address updated successfully" });
    } else {
      res.json({ success: false, message: "Sorry updation failed" });
    }
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

//FOR APPLY COUPON

const applyCoupon = async (req, res, next) => {
  try {
    const { couponCode, totalPrice } = req.body;
    console.log(couponCode, "coe");
    const userId = req.session.user ?? req.cookies.user;
    const uId = userId.toString();

    const couponData = await couponSchema.findOne({ couponCode: couponCode });
    console.log(couponData, couponCode, totalPrice);
    if (!couponData) {
      return res.json({ success: false, message: "coupon is not found" });
    }
    if (totalPrice < couponData?.minPrice) {
      return res.json({
        success: false,
        message: "You are not eligible for this  coupon",
      });
    }

    const offerDiscount = couponData.offer / 100;
    const offerAmount = offerDiscount * totalPrice;

    const maximumOfferAmt =
      couponData?.maxRedeemable < offerAmount
        ? couponData?.maxRedeemable
        : offerAmount;

    const totalAmount = Math.round(totalPrice - maximumOfferAmt);

    const checkUser = await couponSchema.findOne({
      couponCode: couponCode,
      usedUser: { $in: [String(userId)] },
    });

    if (checkUser) {
      return res.json({ success: false, message: "coupon once used" });
    }
    req.session.couponDiscount = totalAmount;
    req.session.couponCode = couponCode;
    req.session.offerAmount = maximumOfferAmt;
    req.session.offer = couponData.offer;
    req.session.b4CouponPrice = totalPrice;
    const totalDiscout = req.session.totalDiscount;

    if (req.session.couponDiscount !== 0 && req.session.couponCode !== 0) {
      return res.json({
        success: true,
        message: "Coupon is applied",
        totalAmount,
        maximumOfferAmt,
        totalDiscout,
      });
    } else {
      return res.json({ success: false, message: "Failed to  apply Coupon" });
    }
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

//PALCE ORDER============================================================
const placeOrder = async (req, res, next) => {
  try {
    const { addressId, addressIndex, paymentMethod } = req.body;
    const userId = req.session.user ?? req.cookies.user;

    const addressData = await addressSchema.findOne({
      userId: userId,
      "addresses._id": addressId,
    });

    let cartData = await cartSchema
      .findOne({ userId: new mongoose.Types.ObjectId(userId) })
      .populate({
        path: "products.productId",
        model: "product",
        populate: {
          path: "category",
          model: "category",
        },
      });
    if (!cartData) {
      return res
        .status(400)
        .json({ success: false, message: "Cart not found." });
    }

    const items = [];
    let totalCost = cartData?.totalCost;
    const newOrderId = generateOrderid();
    let quantity = cartData?.quantity;
    console.log("33333333333333333333333333333333", quantity);
    for (let item of cartData.products) {
      const stock = item.stock;

      if (item.quantity <= 0 || item.quantity > stock) {
        return res.status(400).json({
          success: false,
          message: "Item unavailable or quantity exceeds stock.",
        });
      }
    }
    let deliveryCharge = totalCost < 2500 ? 99 : 0;
    totalCost += deliveryCharge;

    if (totalCost < 2500) {
      const delivaryCharge = 99;
      totalCost += delivaryCharge;
    }

    if (paymentMethod == "COD" && totalCost > 2500) {
      return res.json({
        success: false,
        message: "please choose another payment for above 2500",
      });
    }

    const orderAddress = addressData.addresses[addressIndex];
    console.log("22222222222222222222222222");
    cartData.products.forEach((product) => {
      const price = product.productId.offerPrice
        ? product.productId.offerPrice
        : product.productId.mrp;

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
    console.log("4444444444444444444444");
    let endPrice =
      req.session?.couponDiscount && req.session?.couponDiscount !== 0
        ? req.session?.couponDiscount
        : totalCost;

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

    if (req.session?.couponDiscount && req.session?.couponDiscount !== 0) {
      const couponCode = req.session?.couponCode;

      const couponCheck = await couponSchema.findOne({
        couponCode,
      });

      if (!couponCheck) {
        return res.json({ success: true, message: "Coupon not found" });
      }

      const discountAmout = (couponCheck?.offer / 100) * endPrice;
      const maximumOfferAmt =
        couponCheck?.maxRedeemable < discountAmout
          ? couponCheck?.maxRedeemable
          : discountAmout;

      const endCost = Math.round(totalCost - maximumOfferAmt);

      if (endCost !== req.session?.couponDiscount) {
        return res.json({
          success: false,
          message: "price manipulation found",
        });
      }
    }

    const totalAmount = endPrice;
    // savedOrder?.totalPrice;
    if (paymentMethod === "Wallet") {
      const walletData = await walletSchema.findOne({ userId });
      if (!walletData || walletData?.balance < totalAmount) {
        console.log("haiiaiaiiiiaisi");
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance.",
        });
      }
    }
    let savedOrder = await newOrder.save();
    const orderId = savedOrder?._id;

    if (savedOrder) {
      for (const product of cartData?.products) {
        const prodId = product.productId._id;
        const stock = product.productId.stock;
        const quantity = product.quantity;

        const checkStock = await productSchema.findById(prodId);

        if (checkStock && checkStock.stock - quantity >= 0) {
          checkStock.stock -= quantity;
          await checkStock.save();
        }
      }

      if (
        req.session.couponDiscount ||
        req.session.couponCode ||
        req.session.offerAmount ||
        req.session.offer
      ) {
        delete req.session.couponDiscount;

        delete req.session.offerAmount;
        delete req.session.offer;
      }
    } else {
      return res.json({ success: false, message: "order failed" });
    }
    console.log("555555555555555555555555555");
    //cashon delivary
    if (paymentMethod == "COD") {
      await cartSchema.findOneAndDelete({
        userId: new mongoose.Types.ObjectId(
          typeof userId === "string" ? userId : String(userId)
        ),
      });
      await couponSchema.updateOne(
        { couponCode: req.session?.couponCode },
        { $push: { usedUser: userId } }
      );
      delete req.session.couponCode;
      return res.json({ success: true, message: "order successfull" });
    }
    //razorpay
    if (paymentMethod === "Razorpay") {
      const options = {
        amount: totalAmount * 100,
        currency: "INR",
        receipt: orderId,
        payment_capture: "1",
      };

      const razorpayOrder = await RzyInstance.orders.create(options);

      return res.json({
        success: true,
        message: "Order Success, Ready for payment",
        key_id: process.env.RAZORPAY_KEY_ID,
        orderId: orderId,
        currency: "INR",
        amount: totalAmount * 100,
        razorpayOrderId: razorpayOrder?.id,
      });
    }
    if (paymentMethod === "Wallet") {
      console.log("wallet aaneeeeeeeeeeeeeeeeeeeeeee");
      await walletSchema.findOneAndUpdate(
        { userId },
        {
          $inc: { balance: -totalAmount },
          $push: {
            history: {
              createTime: new Date(),
              amount: totalAmount,
              transactionType: "Debit",
              discription: "Order payment via Wallet",
            },
          },
        },
        { new: true }
      );
      await orderSchema.updateOne(
        { _id: orderId },
        { $set: { paymentStatus: "Paid" } }
      );
      await cartSchema.findOneAndDelete({
        userId: new mongoose.Types.ObjectId(
          typeof userId === "string" ? userId : String(userId)
        ),
      });
      await couponSchema.updateOne(
        { couponCode: req.session?.couponCode },
        { $push: { usedUser: String(userId) } }
      );
      delete req.session.couponCode;
      return res.status(200).json({
        success: true,
        message: "Payment completed using wallet.",
      });
    }
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

//  VERIFY PAYMENT
const verifyPayment = async (req, res, next) => {
  try {
    const { rzy_orderId, rzy_paymentId, orderId, signature } = req.body;
    const userId = req.session.user ?? req.cookies.user;

    // Step 1: Construct expected signature using secret key
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${rzy_orderId}|${rzy_paymentId}`)
      .digest("hex");

    // Step 2: Compare signatures
    if (generated_signature !== signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    let orderData = await orderSchema.findOneAndUpdate(
      { _id: orderId },
      { $set: { paymentStatus: "Paid", rpyPaymentId: rzy_paymentId } }
    );

    await cartSchema.findOneAndDelete({
      userId: new mongoose.Types.ObjectId(
        typeof userId == "string" ? userId : String(userId)
      ),
    });
 
    await couponSchema.updateOne(
      { couponCode: req.session?.couponCode },
      { $push: { usedUser: String(userId) } }
    );
    delete req.session.couponCode;
    
    if (orderData) {
      return res.json({ success: true, message: "order successfull" });
    } else {
      await orderSchema.updateMany(
        { _id: orderId },
        { $set: { paymentStatus: "Failed" } }
      );

      return res.json({ success: false, message: "Payment  Failed" });
    }
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
// DELETE COUPON

const deleteCoupon = async (req, res, next) => {
  try {
    delete req.session.couponDiscount;
    delete req.session.couponCode;
    delete req.session.offerAmount;
    delete req.session.offer;
    res.json({
      success: true,
      message: "coupon removed successfully",
      b4CouponPrice: req.session.b4CouponPrice,
      discuntAmt: req.session.totalDiscount,
    });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

//orderSuccess========================================

const orderSuccess = async (req, res, next) => {
  try {
    res.render("orderSuccess");
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
const paymentFailed = async (req, res, next) => {
  try {
    res.render("paymentFailed");
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

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
};
