const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
       ref:'User',
    },
    balance:{
        type:Number,
        required:true, 
       
    },
    history:[{
        createTime:{
        type:Date,
        default:Date.now
        },
       amount:{
            type:Number,
        },
        transactionType:{
            type:String,

        },
        discription:{
            type:String,

        }
        
    }],
   
},{timestamps:true});

//Export the model
module.exports = mongoose.model('wallet', walletSchema);