const mongoose = require('mongoose')
const User     = require('../models/userModel')
 
const addressSchema =  new mongoose.Schema({ 
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,

    },
    addresses:[{
        name:{
            type:String,
            required:true,
        },
        phone:{
            type:Number, 
            required:true,

        },
        house:{
            type:String,
            requried:true, 

        },
        locality:{
            type:String,
            requried:true,

        },
        city:{
            type:String,
            required:true,

        },
        state:{
            type:String,
            required:true,
 
        },
        pincode:{
            type:Number,
            required:true,

        },
        landmark:{
            type:String,
        },
        addressType:{
            type:String,
            required:true
        },
        
    }]
}, { timestamps: true })
module.exports = mongoose.model('address',addressSchema)