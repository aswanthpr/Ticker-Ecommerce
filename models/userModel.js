const mongoose = require('mongoose');
//const ObjectId = mongoose.Schema.Types.ObjectId;
// Declare the Schema of the Mongo model
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,

    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
        unique:true,
        sparse: true ,

    },
    password: {
        type: String,

    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    referral: {
        type: String,
        unique: true
    },
    referredBy: {
        type: String,

    },
    googleId:{
        type:String,
        unique: true

    }

}, { timestamps: true })

//Export the model
module.exports = mongoose.model('User', userSchema);