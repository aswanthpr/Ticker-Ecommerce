const mongoose = require("mongoose")
const cartSchema = require("../../models/cartModel")
const productSchema = require("../../models/productModel");
const addressSchema = require("../../models/addressModel");

//  GET CART PAGE

const getCart = async (req, res,next) => {
    try {
        const userId = req.session.user??req.cookies.user

        const cartProduct = await cartSchema.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },

            { $unwind: "$products" },

            {
                $lookup:
                {
                    from: "products",
                    localField: "products.productId",
                    foreignField: "_id",
                    as: "productDetails"

                }
            },
        ]);
 const filteredCart = cartProduct.filter(item => item.productDetails.length && item.productDetails[0].status);
        let totalCost = 0;

        filteredCart.forEach(item => {
      const product = item.productDetails[0];
      const price = product.offerPrice ?? product.mrp;
      totalCost += price * item.products.quantity;
    });
console.log(totalCost,cartProduct)
        res.render("cart", { cartProduct, userId, totalCost })
    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

const cartRemove = async (req, res,next) => {
    try {
        const { productId } = req.body;

        const userId = req.session.user??req.cookies.user;

        const cartData = await cartSchema.findOne({ userId: userId }).populate({ path: "products.productId", model: "product" });

        if (!cartData) {
            return res.json({ success: false, message: "Cart not found" });
        }
        let price;
        let prodQuantity;

        cartData.products.forEach(items => {

            if (items.productId._id.toString() == productId) {
                prodQuantity = items.quantity
                price = items.productId.offerPrice ? items.productId.offerPrice : items.productId.mrp

            }

        })

        const lessQuantity = price * prodQuantity;
        const remove = await cartSchema.findOneAndUpdate(
            { userId: userId },
            { $inc: { totalCost: -lessQuantity }, $pull: { products: { productId: productId } } },
            { new: true }
        )


        if (remove) {
            res.json({ success: true, message: "cart Product Removed" })
        } else {
            res.json({ success: false, message: "cart Product not Remov, Please Try Again!" })

        }

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

//increase Cart quantity
const incrementQty = async (req, res,next) => {
    try {
        const userId = req.session.user??req.cookies.user
        const { cartItemId } = req.body
        const cartItem = await cartSchema.findOne({ userId: new mongoose.Types.ObjectId(userId), "products._id": new mongoose.Types.ObjectId(cartItemId) })
        if (!cartItem) {
            return res.json({ success: false, message: "Cart item not found" });
        }
        const items = cartItem.products

        const item = items.find(itm => itm._id == cartItemId)

        if (!item) {
            return res.json({ success: false, message: "Product not found in cart" });
        }
        const productData = await productSchema.findById(item.productId)


        if (productData.stock < item.quantity) {
            res.json({ success: false, message: "product quantity is not sufficient" })
        }

        if (productData.stock > item.quantity) {
            if (item.quantity < 5) {
                const totalCash = productData.offerPrice ? productData.offerPrice : productData.mrp;
                const updated = await cartSchema.findOneAndUpdate({ "products._id": cartItemId }, { $inc: { "products.$.quantity": 1, totalCost: totalCash } }, { new: true })

                return res.json({ success: true, quantity: item.quantity })
            } else {
                return res.json({ success: false, message: "Maximum quantity reached" })
            }

        }



    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

// decrement cart quantity   
const decrementQty = async (req, res,next) => {
    try {
        const userId =req.session.user??req.cookies.user;
        const { cartItemId } = req.body;


        const cartItem = await cartSchema.findOne({ userId: new mongoose.Types.ObjectId(userId), "products._id": new mongoose.Types.ObjectId(cartItemId) })

        if (!cartItem) {
            return res.json({ success: false, message: "Cart item not found" });
        }

        const items = cartItem.products


        const item = items.find(itm => itm._id == cartItemId)

        if (item) {
            const productData = await productSchema.findOne({ _id: item.productId });
            if (productData) {
                const price = productData.offerPrice ? productData.offerPrice : productData.mrp;
                const decreaseQty = await cartSchema.findOneAndUpdate({ "products._id": cartItemId, "products.quantity": { $gt: 1 } }, { $inc: { "products.$.quantity": -1, totalCost: -price } }, { new: true })
                if (decreaseQty) {
                    return res.json({ success: true })
                }
            }
        }

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

//CART CONDITION CHECKING
const cartCondition = async (req, res,next) => {
    try {
        const userId = req.session.user??req.cookies.user;



        const cartProduct = await cartSchema.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },

            { $unwind: "$products" },

            {
                $lookup:
                {
                    from: "products",
                    localField: "products.productId",
                    foreignField: "_id",
                    as: "productDetails"

                }
            },
            { $match: { "productDetails.status": true } },

        ])

console.log(cartProduct,'thsi si the cart',{...cartProduct[0]?.productDetails[0]})
        if (cartProduct.length === 0) {


            return res.json({ success: false, message: 'cart cannot be empty to go further' })
        }
        for (const item of cartProduct) {
            if (item.productDetails[0].stock == 0) {


                return res.json({ success: false, message: 'Not enough stock ,reduce the Quantity' });

            }

            if (item.products.quantity > item.productDetails[0].stock) {

                return res.json({ success: false, message: 'cart item is out of stock' });

            }

            if (item.products.quantit > 5) {

                return res.json({ success: false, message: 'more than 5 same product not alloweded' })
            }


        }


        return res.json({ success: true })

    } catch (error) {
        console.log(error.message);
       next(error)

    }
}
module.exports = {
    getCart,
    cartRemove,
    incrementQty,
    decrementQty,
    cartCondition,

} 