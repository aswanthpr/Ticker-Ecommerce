const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    wishlistItem:[{
        productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product',
        required:true,
        }
    }]
    
}, { versionKey: false })
module.exports = mongoose.model('wishlist',wishlistSchema);
