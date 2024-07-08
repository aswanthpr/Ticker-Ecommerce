
const categOfferSchema =require('../../models/categoryOfferModel');
const prodOfferSchema =require('../../models/productOfferModel');
const categorySchema = require('../../models/categoryModel');
const productSchema = require('../../models/productModel');
const mongoose = require('mongoose')
//GET CATEGORY OFFER PAGAE
const getCategoryOffer= async(req,res)=>{
    try{

        //Pagination
        // const {search} = req.query
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page-1)*limit;
        const totalOffer= await categOfferSchema.countDocuments({});
        const totalPages = Math.ceil(totalOffer/limit);
        const offerData = await categOfferSchema.find({}).populate({path:"categoryId",model:"category"}).sort({createdAt:-1}).skip(skip).limit(limit)
        console.log(offerData,"this is offer data of category");
        const categoryData = await categorySchema.find({})


        res.render('categoryOffer',{offerData,currentPage:page,totalPages,categoryData})
    } catch (error) {
        throw new Error(error.message);

    }
}
//  ADD CATEGORPY OFFER
const addcategoryOffer = async(req,res)=>{
    try {
        
        const {category,offer,validity}=req.body;
       
       
        const categoryData = await categorySchema.findOne({categoryName:category});
        const categoryOffer = await categOfferSchema.findOne({categoryId:categoryData._id})
     
        if(!categoryData ){
            return res.json({success:false,message:'category not found'});
    
        }else{
            const categoryOfferData = await categOfferSchema.findOne({categoryId:new mongoose.Types.ObjectId(categoryData._id)})
            
            
            if(categoryOfferData){
               
                return res.json({success:false,message:'An offer existing in the same category'})
            }
        }
        const createOffer = new categOfferSchema({
            categoryId:categoryData._id,
            offer:offer,
            validity:validity,
    
        })
        const saveOffer =await createOffer.save();
      
        if(saveOffer){
            return res.json({success:true,message:'category offer created successfully'});
    
        }
    } catch (error) {
        throw new Error(error.message)
    }
    }

    //EDIT CATEGORY OFFER
    const editCategoryOffer = async(req,res)=>{
        try {
            const {offerId,offer,categoryName,validity} =req.body;
           
            const categoryData = await categorySchema.findOne({categoryName:categoryName})
            const offerData = await categOfferSchema.findByIdAndUpdate(offerId,{$set:{categoryId:categoryData._id,offer:offer,validity:validity}})
            if(!offerData){
                return res.json({success:false,message:' Catgory offer edit Failed'})
            }
            return res.json({success:true,message:' Catgory offer edit successfull'})
        } catch (error) {
            throw new Error(error.message);
        }
    }
    //DELTET OFFER 
    const deleteCategoryOffer = async(req,res)=>{
        try {
            const {offerId} =req.query;
            

            const categoryData = await  categOfferSchema.findById(offerId);
          
            if(!categoryData){
                return res.json({success:true,message:'category offer not found!'});

            }
            const removeOffer = await categOfferSchema.findByIdAndDelete(offerId);
         
            if(!removeOffer){
                return res.json({success:false,message:'offer is not  deleted '});
            }
            const product = await productSchema.find({status:true,category:categoryData.categoryName})
           for (let i =0;i<product.length;++i){
            if(product[i].offer ==removeOffer.offer){
                
                await product.findOneAndUpdate(
                    {
                        _id:product[i]._id,
                    },
                    {$unset:{offer:"",offerPrice:''}}
                  
                );
            }
           }
           
           
           
           
            return res.json({success:true,message:'offer deleted successfully'})


            
        } catch (error) {
            throw new Error(error.message)
        }
    }




//GET PRODUCT OFFER PAGE  
const getProductOffer= async(req,res)=>{
    try{

        //Pagination
        // const {search} = req.query
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page-1)*limit;
        const totalOffer = await prodOfferSchema.countDocuments({});
        const totalPages = Math.ceil(totalOffer/limit);

        const productData = await productSchema.find();
        const offerData = await prodOfferSchema.find({}).populate({path:"productId",model:"product"}).sort({createdAt:-1}).skip(skip).limit(limit);
       
       return  res.render('productOffer',{offerData,currentPage:page,totalPages,productData})
    } catch (error) {
        throw new Error(error.message);

    }
}

//ADD PRODUCT OFFER
const addProductOffer = async(req,res)=>{
try {
    
    const {product,offer,validity}=req.body;
    const productData = await productSchema.findOne({name:product});
    const offerProduct = await prodOfferSchema.findOne({productId:productData._id})
  
    if(!productData && !offerProduct){
        return res.json({success:false,message:'product not found'});

    }else if(productData&&offerProduct){
        const offerProduct = await prodOfferSchema.findOne({productId:productData._id});

      
        return res.json({success:false,message:' An offer existing in the same product'});
    }
    const createOffer =await new prodOfferSchema({
        productId:productData._id,
        offer:offer,
        validity:validity,

    })
    const saveOffer =await  createOffer.save();
  
    if(saveOffer){
        return res.json({success:true,message:'product offer created successfully'});

    }
} catch (error) {
    throw new Error(error.message)
}
}
//EDIT PRODUCT OFFER
const editProductOffer = async(req,res)=>{
    try {
        const {offerId,offer,validity,productName} = req.body;
       
        const productData = await productSchema.findOne({name:productName})
      
        const offerData = await prodOfferSchema.findByIdAndUpdate(offerId,{$set:{productId:productData._id,offer:offer,validity:validity}})
     
        if(!offerData){
            return res.json({success:false,message:'Something went wrong , Try again..'})
        }
        return res.json({success:true,message:'Product offer Edit successfull'})
    } catch (error) {
        throw new Error(error.message)
    }
}

//PRODUCT OFFER DELETE;
const productOfferDelete = async(req,res) =>{
    try {
        const {offerId} =req.query;

       

        const deleteOffer = await prodOfferSchema.findByIdAndDelete(offerId);
   

        if(!deleteOffer){
            return res.json({success:false,message:' Failed to delete product offer  '});

        };
        const productData = await productSchema.findOneAndUpdate({_id:deleteOffer.productId},{$unset:{offer:'',offerPrice:''}})
        if(productData){
            return res.json({success:true,message:'product offer deleted successfully'});
        }
    } catch (error) {
        throw new Error(error.message);

    }
}
//EXPORTS
module.exports={
    getCategoryOffer,
    addcategoryOffer,
    editCategoryOffer,
    deleteCategoryOffer,


    getProductOffer,
    addProductOffer,
    editProductOffer,
    productOfferDelete, 

}