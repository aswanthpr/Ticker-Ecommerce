const mongoose = require('mongoose');
const { array } = require('../middleware/multer');
// Declare the Schema of the Mongo model
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,

    },
    subtitle: {
        type: String,
        required: true

    },

    brand: {
        type: String,
        required: true,
    },
    stock: {
        type: Number,
        required: true,

    },

    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category",

    },
    gender: {
        type: String,
        required: true,
    },

    mrp: {
        type: Number,
        required: true,
    },
    offerPrice: {
        type: Number,
       
    },
    offer:{
        type:Number,

    },
    color: {
        type: String,
        required: true,

    },

    image: {
        type: [String],
        required: true,

    },
    status: {
        type: Boolean,
        default: true
    }



}, { timestamps: true });

//Export the model
module.exports = mongoose.model('product', productSchema);
