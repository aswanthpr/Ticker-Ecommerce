const mongoose = require("mongoose")
const cartSchema = require("../../models/cartModel")
const productSchema = require("../../models/productModel");
const addressSchema = require("../../models/addressModel");

//  GET CART PAGE

const getCart = async (req, res) => {
    try {
        const userId = req.session.user;

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

        ]);

        let totalCost = 0;

        cartProduct.forEach(item => {
            const total = item.productDetails[0].offerPrice ? item.productDetails[0].offerPrice : item.productDetails[0].mrp;


            totalCost += total * item.products.quantity;

        })
        

        res.render("cart", { cartProduct, userId, totalCost })
    } catch (error) {
        throw new Error(error)
    }
}

const cartRemove = async (req, res) => {
    try {
        const { productId } = req.body;

        const userId = req.session.user;

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
        throw new Error(error)

    }
}

//increase Cart quantity
const incrementQty = async (req, res) => {
    try {
        const userId = req.session.user;
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
        throw new Error(error.mesage)
    }
}

// decrement cart quantity   
const decrementQty = async (req, res) => {
    try {
        const userId = req.session.user;
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
        throw new Error(error)
    }
}

//CART CONDITION CHECKING
const cartCondition = async (req, res) => {
    try {
        const userId = req.session.user;



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
        throw new Error(error.message);
        return res.status(500).json({ success: false, message: error.message });

    }
}
module.exports = {
    getCart,
    cartRemove,
    incrementQty,
    decrementQty,
    cartCondition,

} 