const mongoose = require('mongoose'); // Erase if already required

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderId:{
        type:String,
        required:true,
   },
    totalPrice:{
        type:Number,
        
    },
    couponClaim:{
        type:Number,

    },
    couponOffer:{
        type:Number,

    },
    paymentMethod: {
        type:String,
        
    },
    paymentStatus:{
        type:String,
        default:"Pending",
        enum:["Pending","Paid","Failed","Refunded"],
    },
    rpyPaymentId:{
        type:String,
    },
    expectedDelivary:{
        type:String,
        default: function (){
            const date = new Date();
            date.setDate(date.getDate()+5);
            return date;
        }
    },
    
    orderedItems: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "product",
                required: true,
            },
            image:[{
                type:String,
                required:true
            }],
            productName:{
                type:String,
                required:true,
            },
            offerPrice:{
                type:Number,
                required:true,
            },
            mrp:{
                type:Number,
                
            },
            offer:{
                type:Number,
            },
            brand:{
              type:String,

            },

            category:{
                type:String,
                required:true,
            },
            
            cartQuantity:{
                type:Number,
                required:true
            },
            orderStatus:{
                type:String,
                default:"Pending",
                enum: [
                    "Pending",
                    "Shipped",
                    "Delivered",
                    "Cancelled",
                    "Returned",
                    
                ],
               
            },

            Reason:{
                type:String,
                default:"no reason found"
                
            },
           
           returnApprove:{
                type:Number,
                default:0,
                
            },
        }
    ],
   
    address:{
        name:{
            type:String,
            required:true,
        },
        phone:{
            type:Number,
            required:true
        },
        pincode:{
            type:String,
            required:true
        },
        locality:{
            type:String,
            required:true
        },
        house:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true
        },
        landmark:{
            type:String,
            required:true
        },
        state:{
            type:String,
            required:true
        },
        addressType:{
            type:String,
            required:true
        },
        
    },

   


}, { timestamps: true })
//Export the model
module.exports = mongoose.model('order', orderSchema);