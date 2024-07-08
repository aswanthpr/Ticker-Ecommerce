const couponSchema = require('../../models/couponModel');




//GET COUPON PAGE
const getCoupon = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;

        const skip = (page - 1) * limit;
        const totalCoupon = await couponSchema.countDocuments({});

        const totalPages = Math.ceil(totalCoupon / limit);

        const couponData = await couponSchema.find({}).sort({createdAt:-1});
       
        return res.render('coupon', { couponData, currentPage: page, totalPages });
    } catch (error) {
        throw new Error(error.message);

    }
}


//COUPON ADD
const addCoupon = async (req, res) => {
    try {
       

        const { couponCode, offer, minPrice, maxRedeem, date } = req.body;
        const couponData = await couponSchema.findOne({ couponCode: couponCode })

        if (!couponData) {
            const addCoupon = new couponSchema({
                
                offer: offer,
                validity: date,
                minPrice: minPrice,
                couponCode: couponCode,
                maxRedeemable: maxRedeem,
            })
            const saveCoupon = await addCoupon.save();
         
            
            if(saveCoupon){

                return res.json({success:true,message:'Coupon Created Successfully'})
            }
           
        
        } else {
            
            return res.json({ success: false, message: 'Coupon Name Already Exist' })
            
        }


    } catch (error) {
        throw new Error(error.message); 
    }
}
//LIST UNLIST COUPON
const couponStatus = async(req,res)=>{
    try {
        const {couponId} =req.body;
       
        const couponData = await couponSchema.findById(couponId);
       
        if(couponData.status==true){
            const unlist = await couponSchema.findByIdAndUpdate(couponId,{$set:{status:false}});
           
            return res.json({success:true,message:'Coupon Unlist successfully'})
        }else{
            const list = await couponSchema.findByIdAndUpdate(couponId,{$set:{status:true}});
           
            return res.json({success:true,message:'Coupon List successfully'})
        }

    } catch (error) {
        throw new Error(error.message)
    }
}
//DELETE COUPON
const deleteCoupon = async(req,res)=>{
    try {
        const {couponId} =req.query;
      
        const couponData = await couponSchema.findById(couponId);
        if(couponData){
            const deleteCoupon = await couponSchema.findByIdAndDelete(couponId)
            if(deleteCoupon){
                return res.json({success:true,message:"coupon Deleted from the database"})
            }
        }
    } catch (error) {
        throw new Error(error)
    }
}
module.exports = {
    getCoupon,
    addCoupon,
    couponStatus,
    deleteCoupon

}