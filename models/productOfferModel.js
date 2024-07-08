const mongoose = require('mongoose')

const productOfferSchema = mongoose.Schema({
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product',
        required:true,
    },
    
    offer:{
        type:Number,
        required:true,

    },
    validity:{
        type:Date,
        required:true,
    },
},{timestamps:true})

productOfferSchema.index({"validity":1},{expireAfterSeconds:0});

module.exports = mongoose.model('productOffer',productOfferSchema)