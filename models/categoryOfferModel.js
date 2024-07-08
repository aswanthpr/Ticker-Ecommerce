const mongoose = require('mongoose');

const categoryOfferSchema = mongoose.Schema({
    categoryId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"category",
        required:true,
    },
    offer:{
        type:Number,
        required:true,

    },
    validity:{
        type:Date,
        required:true,
    }
        
},{timestamps:true})

categoryOfferSchema.index({ "validity": 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('categoryOffer',categoryOfferSchema);
