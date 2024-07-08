const mongoose = require('mongoose');


const couponSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        required: true,

    },
    validity: {
        type: Date,
        required: true,
    },
    minPrice: {
        type: Number,
        required: true,
    },
    maxRedeemable: {
        type: Number,
        required: true
    },
    offer: {
        type: Number,
        required: true
    },
    usedUser:{
        type:[]
    },
    status: {  
        type: Boolean,
        default: true, 
    },

}, { timestamps: true })
couponSchema.index({"validity":1},{expireAfterSeconds:0})
module.exports = mongoose.model('coupon', couponSchema)