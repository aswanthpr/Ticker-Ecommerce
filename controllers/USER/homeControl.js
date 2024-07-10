const productSchema = require('../../models/productModel');
const cartSchema = require('../../models/cartModel');
const categorySchema = require('../../models/categoryModel');
const userSchema = require('../../models/userModel');
const categoryOfferSchema = require('../../models/categoryOfferModel');
const productOfferSchema = require('../../models/productOfferModel');

const mongoose = require('mongoose');



const getHome = async (req, res,next) => {
  try {
    const user = req.session.user;

    const productOffers = await productOfferSchema.find().populate({ path: "productId", model: "product", populate: { path: "category", model: "category" } });


    const categoryOffers = await categoryOfferSchema.find().populate({ path: "categoryId", model: "category" });



    if (categoryOffers) {

      const products = await productSchema.find({ status: true }).populate({ path: "category", model: "category" });

      for (let i = 0; i < products.length; ++i) {

        const product = products[i];



        const matchingCategory = categoryOffers.find(offer => {


          return offer.categoryId.categoryName == product.category.categoryName;

        });


        if (matchingCategory) {

          const discountRate = matchingCategory.offer / 100;
          const discountAmount = discountRate * product.mrp;
          const offerPrice = product.mrp - discountAmount;



          await productSchema.updateOne({ _id: product._id }, { $set: { offerPrice: Math.round(offerPrice), offer: matchingCategory.offer } });

        };


      };

    };



    //categoryOffer;


    for (let i = 0; i < productOffers.length; ++i) {
      const productOffer = productOffers[i];
     

      const categoryName = productOffer?.productId?.category?.categoryName;

      const categoryCheck = await categorySchema.find({ categoryName: categoryName });


      if (categoryCheck) {

        const categoryOfferCheck = await categoryOfferSchema.findOne({ categoryId: categoryCheck[0]._id })

        let offerPrice = productOffer.productId.mrp;


        if (productOffer.offer) {

          const discountRate = productOffer.offer / 100;
          const discountAmount = offerPrice * discountRate;
          offerPrice -= discountAmount;
        };



        let categoryOfferPrice = productOffer.productId.mrp;


        if (categoryOfferPrice) {
          const discountRate = categoryOfferCheck.offer / 100;
          const discountAmount = discountRate * categoryOfferPrice;
          categoryOfferPrice -= discountAmount;
        }
        const greatestOffer = Math.max(productOffer.offer || 0, (categoryOfferCheck ? categoryOfferCheck.offer : 0))


        const prodId = productOffer.productId._id;
        const finalOfferPrice = Math.round(Math.min(offerPrice, categoryOfferPrice));

        const updateOffer = await productSchema.updateOne(
          { _id: prodId },
          { $set: { offerPrice: finalOfferPrice, offer: greatestOffer } });

      }

    }


    const productData = await productSchema.find({ status: true, stock: { $gt: 1 } }).limit(8).sort({ createdAt: -1 })

    const cartData = await cartSchema.findOne({ userId: user }).populate('products.productId');
    const cartCount = cartData ? cartData.products.length : 0;



    res.render("home", { productData, user, cartCount });
  } catch (error) {  
    console.log(error.message);
    next(error)
  }
};

//VIEW PRODUCT DETAILES ==========================================================
const getViewProduct = async (req, res,next) => {
  try {
    const userId = req.session.user;
    const prodId = req.query.id;
    
    const productData = await productSchema.findOne({ _id: new mongoose.Types.ObjectId(prodId) }).populate({path:'category',model:'category'})
   

   
    const cartData = await cartSchema.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    const cartCount = cartData ? cartData.products.length : 0;


    const relatedData = await productSchema.find({
      $and: [
        { _id: { $ne: prodId }, },
        { status: true },
        { category: new mongoose.Types.ObjectId(productData?.category?._id) }
      ]
    }).limit(7);


console.log(relatedData,'thsi is relaed data')
    res.render("productDetail", { productData, relatedData, userId, cartCount })
  } catch (error) {
    console.log(error.message);
    next(error)

  }

}

//ADD TO CART================================================
const addToCart = async (req, res,next) => {
  try {
    const userId = req.session.user;
    const { prodId } = req.body;
    const userData = await userSchema.findById(userId);




    if (!userData) {
      return res.json({ success: false, message: "User need to Login " })

    }
    const productData = await productSchema.findOne({ _id: new mongoose.Types.ObjectId(prodId) })

    if (!productData) {
      return res.json({ success: false, message: "product not found" })

    }
    if (productData.stock == 0) {
      return res.json({ success: false, message: "product out of stock" })
    }
    const existingCartItem = await cartSchema.findOne({ userId: userId, "products.productId": prodId });

    if (existingCartItem) {
      return res.json({ success: false, message: "product already existing in Cart" })

    }
    const userCart = await cartSchema.findOne({ userId: userId });
    const totalAmount = productData.offerPrice ? productData.offerPrice : productData.mrp;
    if (userCart) {

      const addCart = await cartSchema.updateOne(
        { userId: userId },
        { $push: { products: { productId: prodId } }, $inc: { totalCost: totalAmount } },

        { upsert: true }
      );

    } else {
      const addCart = await cartSchema.updateOne(
        { userId: userId },
        { $push: { products: { productId: prodId } }, $set: { totalCost: totalAmount } },

        { upsert: true }
      );

    }


    return res.json({ success: true, message: "product added to cart" }

    )
  } catch (error) {
    console.log(error.message);
    next(error)

  }
}

//  ALL PRODUCTS ==============================================
const getAllProduct = async (req, res,next) => {
  try {

    const userId = req.session.user;

    //pagination parameters
    const page = req.query.page || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    //Query parameters

    const searchQuery = req.query.search || "";
    const categoryFilter = req.query?.category ? req.query?.category.split(',') : [];
    const genderFilter = req.query.gender ? req.query.gender.split(',') : [];
    const minPrice = parseInt(req.query.minPrice) || 0;
    const maxPrice = parseInt(req.query.maxPrice) || Infinity;
    const sortBy = req.query.sortBy || "aA-zZ";

    //constructing thee filter object 

    const filter = {
      status: true,
      name: { $regex: new RegExp(searchQuery, 'i') },
      mrp: { $gte: minPrice, $lte: maxPrice }
    };
    if (categoryFilter.length > 0) {
      filter.category = { $in: categoryFilter };

    }
    if (genderFilter.length > 0) {
      filter.gender = { $in: genderFilter }
    }


    //sorting operation

    let sortOption = {};
    if (sortBy === "aA-zZ") {

      sortOption = { name: 1 }
    } else if (sortBy === "zZ-aA") {
      sortOption = { name: -1 };
    }
    else if (sortBy === "New arrived") {
      sortOption = { createdAt: -1 };

    }
    else if (sortBy === "High to low") {
      sortOption = { mrp: -1 };

    } else if (sortBy === "Low to high") {
      sortOption = { mrp: 1 }
    }
    else {
      sortOption = { updatedAt: 1 };
    }


    const productData = await productSchema.find(filter).populate("category").sort(sortOption).skip(skip).limit(limit);


    const totalProducts = await productSchema.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);
    const categories = await categorySchema.find({ status: true });
    const cartData = await cartSchema.findOne({ userId: userId }).populate('products.productId');
    const cartCount = cartData ? cartData.products.length : 0;



    const genders = ["Men", "Women", "Unisex", "Pair"];



    res.render("shop", { productData, categories, userId, genders, cartCount, totalPages, currentPage: page, selectedCategories: categoryFilter, selectedGenders: genderFilter, minPrice, maxPrice, sortBy, search: searchQuery });
  } catch (error) {
    console.log(error.message);
       next(error)
  }
}



module.exports = {
  getHome,
  getViewProduct,
  addToCart,
  getAllProduct,



}