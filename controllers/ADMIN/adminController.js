require("dotenv").config();
const userSchema = require("../../models/userModel");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");
const { generate } = require("otp-generator");
const categoryOfferSchema = require("../../models/categoryOfferModel");
const productOfferSchema = require("../../models/productOfferModel");
const orderSchema = require("../../models/orderModel");
const productSchema = require("../../models/productModel");

//GET ADMIN LOGIN =============================================

const getAdminLogin = async (req, res, next) => {
  try {
    res.render("adminlogin");
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
//POST ADMIN LOGIN=============================================
const postAdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const adminData = await userSchema.findOne({ email });

    if (!adminData || !adminData.isAdmin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or not an admin" });
    }

    const passMatch = await bcrypt.compare(password, adminData.password);

    if (!passMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password" });
    }

    req.session.admin = adminData._id;
    res.cookie("admin", adminData?._id.toString(), {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
    // next(error)
  }
};
//GET ADMIN DASHBOARD==========================================
const getDashboard = async (req, res, next) => {
  try {
    //userCount
    const userData = await userSchema.countDocuments({ isBlocked: false });
    //total Sales
    const totalSales = await orderSchema.aggregate([
      { $unwind: "$orderedItems" },
      {
        $match: {
          "orderedItems.orderStatus": { $nin: ["Cancelled", "Returned"] },
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]);

    //total amount

    const totalCost = await orderSchema.aggregate([
      {
        $unwind: "$orderedItems",
      },

      {
        $match: {
          "orderedItems.orderStatus": { $nin: ["Returned", "Cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          sumAmount: {
            $sum: {
              $multiply: [
                "$orderedItems.offerPrice",
                "$orderedItems.cartQuantity",
              ],
            },
          },
        },
      },
    ]);

    //this is totalOffer
    const totalOfferAmt = await orderSchema.aggregate([
      { $unwind: "$orderedItems" },
      {
        $match: {
          "orderedItems.orderStatus": { $in: ["Cancelled", "Returned"] },
        },
      },
      {
        $addFields: {
          offerAmount: {
            $subtract: ["$orderedItems.mrp", "$orderedItems.offerPrice"],
          },
        },
      },

      {
        $group: {
          _id: null,
          sumOffer: { $sum: "$offerAmount" },
          couponSum: { $sum: "$couponClaim" },
        },
      },
      { $addFields: { totalDiscount: { $add: ["$sumOffer", "$couponSum"] } } },
    ]);

    //
    const { timePeriod } = req.query;
    let startDate, endDate;

    let timePeriods = ["Today", "Last-week", "Last-month", "Last-year"];
    let currentPeriod = timePeriod;
    const currentDate = new Date();
    if (timePeriod == undefined || timePeriod === "Today") {
      startDate = new Date(currentDate.setHours(0, 0, 0, 0));
      endDate = new Date(currentDate.setHours(23, 59, 59, 999));
      currentPeriod = "Today";
    } else if (timePeriod === "Last-week") {
      const firstDayOfPreviousWeek = new Date(currentDate);
      firstDayOfPreviousWeek.setDate(
        currentDate.getDate() - currentDate.getDay() - 7
      );
      firstDayOfPreviousWeek.setHours(0, 0, 0, 0);

      let lastDayOfPreviousWeek = new Date(firstDayOfPreviousWeek);
      lastDayOfPreviousWeek.setDate(firstDayOfPreviousWeek.getDate() + 6);
      lastDayOfPreviousWeek.setHours(23, 59, 59, 999);

      startDate = firstDayOfPreviousWeek;
      endDate = lastDayOfPreviousWeek;
    } else if (timePeriod === "Last-month") {
      startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      );
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    } else if (timePeriod === "Last-year") {
      startDate = new Date(currentDate.getFullYear(), 0, 1);
      endDate = new Date(currentDate.getFullYear(), 11, 31);
    }

    const salesData = await orderSchema.find({
      createdAt: { $gte: startDate, $lt: endDate },
      "orderedItems.orderStatus": { $nin: ["Cancelled", "Returned"] },
    });

    //    const  salesDat = await orderSchema.aggregate([
    //         { $unwind: "$orderedItems" },
    //         { $match: { createdAt: { $gte: startDate, $lte: endDate }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },

    //     ]);
    console.log(salesData, "this is sales data b");

    let xValues = [];
    let yValues = [];

    if (timePeriod == undefined || timePeriod === "Today") {
      xValues.push(currentDate.getDate());
      yValues.push(
        salesData.reduce((total, order) => total + order.totalPrice, 0)
      );
    } else if (timePeriod === "Last-week" || timePeriod == "Last-month") {
      const daysInPeriod =
        timePeriod === "Last-week"
          ? 7
          : new Date(
              startDate.getFullYear(),
              startDate.getMonth() + 1,
              0
            ).getDate();
      for (let i = 0; i < daysInPeriod; i++) {
        const currentPeriodDate = new Date(startDate);
        currentPeriodDate.setDate(startDate.getDate() + i);
        xValues.push(currentPeriodDate.getDate());

        const totalAmount = salesData
          .filter(
            (order) =>
              new Date(order.createdAt).getDate() ===
              currentPeriodDate.getDate()
          )
          .reduce((total, order) => total + order.totalPrice, 0);

        yValues.push(totalAmount);
      }
    } else if (timePeriod === "Last-year") {
      for (let i = 0; i < 12; i++) {
        const currentMonth = new Date(currentDate.getFullYear(), i, 1);
        xValues.push(
          currentMonth.toLocaleString("default", { month: "short" })
        );
        const totalAmount = salesData
          .filter((order) => new Date(order.createdAt).getMonth() === i)
          .reduce((total, order) => total + order.totalPrice, 0);
        yValues.push(totalAmount);
      }
    }

    const bestSellingProducts = await orderSchema.aggregate([
      { $unwind: "$orderedItems" },
      {
        $match: {
          "orderedItems.orderStatus": { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $group: {
          _id: "$orderedItems.productName",
          totalSoldQuantity: { $sum: 1 },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 4 },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
    ]);
    let xValue = [];
    let yValue = [];

    bestSellingProducts.forEach((item) => {
      xValue.push(item._id);
      yValue.push(item.totalSoldQuantity);
    });

    //best selling category
    const bestSellingCategory = await orderSchema.aggregate([
      {
        $unwind: "$orderedItems",
      },
      {
        $match: {
          "orderedItems.orderStatus": { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $group: {
          _id: "$orderedItems.category",
          totalQuantitySold: { $sum: 1 },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 5 },
    ]);

    let xCateg = [];
    let yCateg = [];

    bestSellingCategory.forEach((item) => {
      xCateg.push(item._id);
      yCateg.push(item.totalQuantitySold);
    });

    const topBrand = await orderSchema.aggregate([
      {
        $unwind: "$orderedItems",
      },
      {
        $match: {
          "orderedItems.orderStatus": { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      { $group: { _id: "$productDetails.brand", saleCount: { $sum: 1 } } },
      { $sort: { saleCount: -1 } },
      { $limit: 5 },
    ]);
    let brandX = [];
    let brandY = [];
    topBrand.forEach((item) => {
      brandX.push(item._id);
      brandY.push(item.saleCount);
    });

    res.render("dashboard", {
      userData,
      totalSales,
      totalCost,
      totalOfferAmt,
      xValues: JSON.stringify(xValues),
      yValues: JSON.stringify(yValues),
      productX: JSON.stringify(xValue),
      productY: JSON.stringify(yValue),
      categoryX: JSON.stringify(xCateg),
      categoryY: JSON.stringify(yCateg),
      brandX: JSON.stringify(brandX),
      brandY: JSON.stringify(brandY),
      currentPeriod,
      timePeriods,
    });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

//LOGOUT ====================================================
const postLogout = async (req, res, next) => {
  try {
    req.session.id = null;

    res.redirect("/admin/login");
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

//GET USERS===================================================
const getUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const totalUser = await userSchema.countDocuments({ isAdmin: false });
    const totalPages = Math.ceil(totalUser / limit);
    const userData = await userSchema
      .find({ isAdmin: false })
      .skip(skip)
      .limit(limit);

    res.render("user", { userData, currentPage: page, totalPages, search });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
//BLOCK USER
const blockUser = async (req, res, next) => {
  try {
    const id = req.params.id;

    const blockUser = await userSchema.findByIdAndUpdate(id, {
      $set: { isBlocked: true },
    });

    if (blockUser) {
      return res.status(200).json({ success: "user successfully blocked" });
    } else {
      return res.status(404).json({ error: "user not found" });
    }
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

//UNBLOCK USER
const unblockUser = async (req, res, next) => {
  try {
    const id = req.params.id;

    const unBlockUser = await userSchema.updateOne(
      { _id: id },
      { $set: { isBlocked: false } }
    );
    if (unBlockUser) {
      return res.status(200).json({ success: "user successfully unblocked  " });
    } else {
      return res.status(404).json({ error: "user not found" });
    }
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
//ADMIN LOGOUT================================================
const adminLogout = async (req, res, next) => {
  try {
    req.session.destroy();
    res.clearCookie("admin");
    res.redirect("/admin/login");
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
//USER SEARCH==================================================

const userSearch = async (req, res, next) => {
  try {
    const { search } = req.query;

    const page = parseInt(req.query.search) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const totalUser = await userSchema.countDocuments({ isAdmin: false });
    let totalPages = Math.ceil(totalUser / limit);
    const userData = await userSchema
      .find({
        isAdmin: false,
        $or: [
          { name: { $regex: `^${search}`, $options: "i" } },
          { email: { $regex: `${search}`, $options: "i" } },
        ],
      })
      .skip(skip)
      .limit(limit);

    if (userData) {
      res.render("user", { userData, totalPages, currentPage: page, search });
    } else {
      res.render("user", { search });
    }
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
//MODULE EXPORT===============================================
module.exports = {
  getAdminLogin,
  postAdminLogin,
  getDashboard,
  getUsers,
  postLogout,
  blockUser,
  unblockUser,
  adminLogout,
  userSearch,
};
