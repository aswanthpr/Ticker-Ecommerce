const mongoose = require("mongoose")


const cartSchema = new  mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        
    },
    totalCost: {
        type: Number,
        default: 0,
       
    },
    products:[
        {
            productId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'product',
                required:true,
                
            },
            quantity:{
                type:Number,
                default:1,

            },
            

        },
        
    ],
    
}, { timestamps: true })
module.exports = mongoose.model("cart",cartSchema);
