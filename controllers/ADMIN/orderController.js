const userSchema = require("../../models/userModel");
const orderSchema = require("../../models/orderModel");
const productSchema = require("../../models/productModel");
const walletSchema = require("../../models/walletModel");

const mongoose = require("mongoose");

//GET ORDERS
const getOrders = async (req, res, next) => {
  try {
    const { search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    let searcher = {};

    const totalOrders = await orderSchema.countDocuments({});
    const totalPages = Math.ceil(totalOrders / limit);

    if (search) {
      searcher = {
        $or: [
          { orderId: { $regex: `^${search}`, $options: "i" } },

          { paymentStatus: { $regex: `^${search}`, $options: "i" } },
          {
            orderedItems: {
              $elemMatch: {
                $or: [
                  { productName: { $regex: `^${search}`, $options: "i" } },
                  { orderStatus: { $regex: `^${search}`, $options: "i" } },
                ],
              },
            },
          },
        ],
      };
    }
    let orderData = await orderSchema
      .find(searcher)
      .populate({
        path: "userId",
        select: "name email",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("orderMgt", {
      orderData,
      currentPage: page,
      totalPages,
      search,
    });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
//ORDER DETAILS====================================
const adminOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.query;

    const orderData = await orderSchema
      .findOne({ orderId: orderId })
      .populate("userId");

    res.render("order-details", { orderData });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

//CHANGE ORDER STATUS==============
const changeOrderStatus = async (req, res, next) => {
  try {
    const { orderId, productId, newStatus } = req.body;

    const updateStatus = await orderSchema.findOneAndUpdate(
      {
        orderId: orderId,
        "orderedItems.productId": productId,
      },
      { $set: { "orderedItems.$.orderStatus": newStatus } },
      { new: true }
    );

    if (newStatus == "Cancelled") {
      const cancelledProduct = updateStatus.orderedItems.find(
        (item) => item.productId.toString() === productId
      );
      const cancelledQuantity = parseInt(cancelledProduct.cartQuantity);

      await productSchema.updateOne(
        {
          _id: productId,
        },
        {
          $inc: { stock: cancelledQuantity },
        }
      );
    }
    if (updateStatus.paymentMethod == "COD" && newStatus == "Delivered") {
      await orderSchema.updateOne(
        {
          orderId: orderId,
          "orderedItems.productId": new mongoose.Types.ObjectId(productId),
        },
        { $set: { paymentStatus: "Paid" } }
      );
    }
    if (updateStatus) {
      return res.json({ success: true, message: "update successfully" });
    } else {
      return res.json({ success: false, message: "updation failed" });
    }
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
//APPROVE  RETURN REQUEST
const approveReturn = async (req, res, next) => {
  try {
    const { orderId, productId, reason } = req.body;
    if (!orderId || !productId || typeof reason !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request data" });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid productId format" });
    }

    const returnApprove = await orderSchema.findOneAndUpdate(
      {
        orderId,
        "orderedItems.productId": new mongoose.Types.ObjectId(
          typeof productId === "string" ? productId : String(productId)
        ),
      },
      {
        $set: {
          "orderedItems.$.returnApprove": 2,
          "orderedItems.$.orderStatus": "Returned",
          "orderedItems.$.Reason": reason,
        },
      },
      { new: true }
    );
    if (!returnApprove) {
      return res
        .status(404)
        .json({ success: false, message: "Order or Product not found" });
    }
    //geting userId form orderData
    const userId = returnApprove?.userId;

    const returnedProduct = returnApprove.orderedItems.find(
      (item) => item.productId.toString() === productId
    );
    if (!returnedProduct) {
      return res.status(400).json({
        success: false,
        message: "Returned product not found in order",
      });
    }

    const returnedQuantity = parseInt(returnedProduct.cartQuantity, 10);
    if (isNaN(returnedQuantity)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid cart quantity" });
    }

    if (returnedProduct.Reason !== "Defective or Damaged Product") {
      await productSchema.updateOne(
        { _id: productId },
        { $inc: { stock: returnedQuantity } },
        { new: true }
      );
    }
    const FREE_DELIVERY_LIMIT = 2500;
    const DELIVERY_CHARGE = 99;
    console.log(returnApprove, "return approve");
    if (returnApprove) {
      const productPrice =
        (returnedProduct?.offerPrice
          ? returnedProduct?.offerPrice
          : returnedProduct.mrp) * returnedProduct.cartQuantity;
      console.log(productPrice, "productPrice");

      let totalPrice = returnApprove.totalPrice;
      console.log(totalPrice, "totalPrice from return approve");
      totalPrice =
        totalPrice < FREE_DELIVERY_LIMIT
          ? totalPrice - DELIVERY_CHARGE
          : totalPrice;
      let discountAmount =
        returnApprove?.couponClaim && returnApprove?.couponOffer
          ? returnApprove?.couponClaim
          : 0;

      //   const productQuantity = returnApprove?.orderedItems.reduce(
      //     (total, item) => total + item?.cartQuantity,
      //     0
      //   );

      const totalDistinctItem = returnApprove.orderedItems.length;
      console.log(totalDistinctItem, "ordered items length");
      let refundAmount = 0;
      if (returnApprove?.couponClaim && returnApprove?.couponOffer) {
        const couponAmount = returnApprove?.couponClaim / totalDistinctItem;
        console.log(couponAmount, "claimed coupon amount");
        refundAmount = productPrice - couponAmount;
      } else {
        refundAmount = productPrice;
      }

      const walletData = await walletSchema.findOne({ userId });
      const newWallet = await walletSchema.updateOne(
        { userId }, //: new mongoose.Types.ObjectId(userId)
        {
          $inc: { balance: refundAmount },
          $push: {
            history: {
              createTime: new Date(),
              amount: refundAmount,
              transactionType: "Credit",
              discription: "Returned product Amount Credited",
            },
          },
        },
        { upsert: true }
      );
      if (newWallet.modifiedCount > 0) {
        await orderSchema.updateOne(
          { orderId: orderId },
          { $set: { paymentStatus: "Refunded" } }
        );
      }

      return res.json({ success: true, message: "Return approved" });
    } else {
      return res.json({ success: false, message: "returne approve failed" });
    }
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

//DECLINE RETURN REQUEST
const declineReturn = async (req, res, next) => {
  try {
    const { orderId, productId } = req.body;

    const returnDecline = await orderSchema.findOneAndUpdate(
      {
        orderId: orderId,
        "orderedItems.productId": new mongoose.Types.ObjectId(
          typeof productId === "string" ? productId : String(productId)
        ),
      },
      { $set: { "orderedItems.$.returnApprove": 3 } },
      { new: true }
    );
    console.log(returnDecline, "return decl");
    if (returnDecline) {
      return res.json({ success: true, message: "Return declined" });
    } else {
      return res.json({ success: false, message: "Return decline Failed" });
    }
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
//  ORDER SEARCH==============================================

module.exports = {
  getOrders,
  adminOrderDetails,
  changeOrderStatus,
  approveReturn,
  declineReturn,
};
