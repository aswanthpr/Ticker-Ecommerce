const wishlistSchema = require('../../models/wishlistModel')
const cartSchema = require('../../models/cartModel');
const userSchema = require('../../models/userModel');
const productSchema = require('../../models/productModel')
//GET WISHLIST======================================

const getWishlist = async (req, res, next) => {
  try {

    const userId =req.session.user??req.cookies.user


    const cartData = await cartSchema.findOne({ userId: userId }).populate('products.productId');
    const cartCount = cartData ? cartData.products.length : 0;

    const wishlistData = await wishlistSchema.findOne({ userId: userId }).populate('wishlistItem.productId');




    res.render('wishlist', { wishlistData, cartCount, userId });

  } catch (error) {

    console.log(error.message);
    next(error)
  }
}
//ADD TO WISHLIST ===============================================
const addToWishlist = async (req, res, next) => {
  try {
    const userId = req.session.user??req.cookies.user
    if (!userId) {
      return res.status(401).json({ success: false, message: "User needs to login" });
    }

    const { productId } = req.body;
    
    const userData = await userSchema.findById(userId);
    
    if (!userData) {
      return res.json({ success: false, message: "User need to Login " })
      
    }
    const wishlistData = await wishlistSchema.findOne({ userId: userId })
   
    if (wishlistData) {


      const existingItem = wishlistData.wishlistItem.some(item => item.productId.toString() === productId);
      if (existingItem) {
        return res.json({ success: false, message: 'Product already in wishlist' });

      } else {


        wishlistData.wishlistItem.push({ productId });
        await wishlistData.save();

        return res.status(200).json({ success: true, message: 'Product Added to wishlist' });

      }

    } else {

      const newItem = new wishlistSchema({
        userId: userId,
        wishlistItem: [{ productId }]
      });
       await newItem.save();

      return res.status(200).json({ success: true, message: 'product added to Wishlist' })
    }

  } catch (error) {
    console.log(error.message);
    next(error)
  }
}

//REMOVE WIHSLIST PRODUCT
const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    const userId = req.session.user??req.cookies.user

    const removeItem = await wishlistSchema.findOneAndUpdate(
      { userId: userId },
      { $pull: { wishlistItem: { productId: productId } } }

    );
    if (removeItem) {
      return res.status(200).json({ success: true, message: 'Product removed From wishlist' })
    } else {
      return res.status(400).json({ success: false, message: 'Failed to remove product from wishlist' });
    }

  } catch (error) {
    console.log(error.message);
    next(error)

  }
}
//WISHLIST TO ADD TO CART
const wishlitstToCart = async (req, res, next) => {

  try {
    const { prodId } = req.body;

    const userId = req.session.user??req.cookies.user;

    const productData = await productSchema.findById(prodId);

    if (!productData) {
      return res.json({ success: false, message: 'product not found' });

    }
    if (productData.stock == 0) {
      return res.json({ success: false, message: 'product stock out' });

    }

    const existingCartItem = await cartSchema.findOne({ userId: userId, "products.productId": prodId });

    if (existingCartItem) {
      return res.json({ success: false, message: 'Product Already existing in the cart' });

    }
    const totalAmount = productData?.offerPrice ? productData?.offerPrice : productData?.mrp;
    const addToCart = await cartSchema.updateOne(
      {
        userId: userId
      },
      { $push: { products: { productId: prodId } }, $inc: { totalCost: totalAmount } },
      { upsert: true }
    );

    if (addToCart) {
      const wishlistRemove = await wishlistSchema.updateOne({ userId: userId }, { $pull: { wishlistItem: { productId: prodId } } });

      if (wishlistRemove.modifiedCount > 0) {
        res.json({ success: true, message: "Added to Cart" });
      }
    }

  } catch (error) {
    console.log(error.message);
    next(error)
  }
}
module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  wishlitstToCart

}