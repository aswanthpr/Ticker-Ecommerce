const productSchema = require("../../models/productModel");
const categorySchema = require("../../models/categoryModel");
const orderSchema = require("../../models/orderModel");
const mongoose = require("mongoose")
 
//GET PRODUCT=================================================
const getProduct = async (req, res) => {
    try {
        const {search} = req.query;
        const page = parseInt(req.query.page) || 1;
        const  limit  = 6 ;
        const skip = (page-1)*limit;
        const totalProducts = await productSchema.countDocuments({});
        const totalPages = Math.ceil(totalProducts/limit);
         let searcher ={}
         if(search){
            searcher={
                $or: [
                    { name: { $regex: `^${search}`, $options: 'i' } }, 
                    { brand: { $regex: `^${search}`, $options: 'i' } }, 
                    { gender: { $regex: `^${search}`, $options: 'i' } },
                    
          
                  ]
            }
         }
        const productData = await productSchema.find(searcher).populate({path:"category",model:"category",select:"categoryName"}).sort({createdAt:-1}).skip(skip).limit(limit);
       
        return res.render("product", { productData,currentPage:page,totalPages,search });

    } catch (error) {
        throw new Error(error)
    }
}

//GET CREATE PRODUCT==================================
const getCreateProduct = async (req, res) => {
    try {
        const categoryData = await categorySchema.find({ status: true })

        res.render("createProducts", { categoryData })
    } catch (error) {
        throw new Error(error)
    }
}
//ADD PRODUCT ===========================================

const createProduct = async (req, res) => {
    try {
      

        const { name, subtitle, mrp, brand, stock, category, gender, color } = req.body;
       
        if (!name || !subtitle || !mrp || !brand || !stock || !category || !gender || !color) {
            return res.json({ success: false, message: "All fields are required" });
        }

        if (!req.files || req.files.length === 0) {
            return res.json({ success: false, message: "image files required " });
        }

       
        const images = req.files.map(file => file.filename);

        const categoryObj = await categorySchema.findOne({ categoryName: category });
        const productData = await productSchema.findOne({ name: name, gender: gender, category: categoryObj._id });
       

        if (productData) {
            return res.json({ success:false, message: 'Product already exists' });
        } else {

            const newProduct = new productSchema({
                name: name,
                subtitle: subtitle,
                brand: brand,
                stock: stock,
                category: categoryObj._id,
                gender: gender,
                image: images,
                mrp: mrp,
                color: color
            });

            const savedProduct = await newProduct.save();
           
            return res.json({ success: true, message:"Product successfully inserted" });

        }

    } catch (error) {
      
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

//LIST AND UNLIST  PRODUCT ===========================================

const productList = async (req, res) => {
    try {
        const id = req.params.id;


        const list = await productSchema.updateOne({ _id: id }, { $set: { status: true } });
        if (list) {

            res.status(200).json({ message: "Category listed successfully" });
           
        } else {
            res.status(404).json({ message: "Product not found or could not be listed" })
        }

    } catch (error) {
        throw new Error(error)
    } 
}

const productUnlist = async (req, res) => {
    try {
        const id = req.params.id;

        const unlist = await productSchema.updateOne({ _id: id }, { $set: { status: false } })
        if (unlist) {

            res.status(200).json({ message: " " });
          
        } else {
            res.status(404).json({ message: "Product not found or could not be unlisted" });
        }

    } catch (error) {
        throw new Error(error)
    }
}

const getEditProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const proData = await productSchema.find({ _id: id }).populate('category')
        const category = await categorySchema.find({})

        res.render("editProducts", { proData, category })
 
    } catch (error) {
        throw new Error(error)
    }
}

const uploadImage = async(req,res)=>{
    try {
         
        const {prodId} = req.params
       
        const newImages = req.files.map(file => file.filename);
        
       
        if(newImages.length>0){
               const dataCheck =  await productSchema.findByIdAndUpdate(prodId,{$push:{image:{$each:newImages}}})
          
               if(dataCheck){
               
            return res.json({success:true})
           }
            }
           
    } catch (error) {
        throw new Error(error)
    }
}
const editProduct = async (req, res) => {
    try {
        const {prodId} = req.params;
  
       
        const { name, subtitle, mrp, brand, stock, category, gender, color } = req.body
        const existingProduct = await productSchema.findOne({name:name, _id:{$ne:prodId} })
       
        const categoryData = await categorySchema.findOne({categoryName:category})
       
        // const newImages = req.files.map(file => file.filename);

        if (existingProduct) {
            return res.status(400).json({ error:true, message: "A product with the same name already exists." });
        }else{
            // if(newImages.length>0){
            //     await productSchema.findByIdAndUpdate({_id:prodId},{$push:{image:{$each:newImages}}})
            // }
           

            await productSchema.findByIdAndUpdate(prodId ,
                 {
                $set: {
                 name: name,
                subtitle: subtitle,
                brand: brand,
                stock: stock,
                category: categoryData._id,
                gender: gender,
                mrp: mrp,
                color: color,
                }
            },{new:true})


            res.status(200).json({success:true, message:"product updated successfully"})
        }
           

    } catch (error) {
       
        res.status(500).json({ message: 'Internal server error' });
    }
}
const deleteImage = async(req,res)=>{
    try {
        const {id,imageId} = req.query;

        const response = await productSchema.findOneAndUpdate(
            {_id:id},
               { $pull:{image:imageId}},
               {new:true}
            )
            if(response){
                res.status(200).json({success:true,message:'image deleted  successfully'})

            }else{
                res.status(400).json({success:false,message:'image is not found in products or product not found'})
            }
    } catch (error) {
        res.status(500).json({success:true,message:"Internal server error"});
        throw new Error(error)

    }
}

const deleteProduct = async (req, res) => { 
    try {
        const {productId} = req.body;
       
       
        let checkProduct = await orderSchema.find({
            orderedItems: { 
              $elemMatch: {
                productId: new mongoose.Types.ObjectId(productId)
              }
            }
          });
      

     
        if(checkProduct){
            return res.status(400).json({ message: "Product is ordered and cannot be deleted" });
        }else{
            const deleted = await productSchema.findByIdAndDelete({ _id: productId })
            if (deleted) {
                return res.status(200).json({ message: "Product deleted successfully" });
            } else {
                return res.status(404).json({ message: "Product not found" });
            }
        }
       
    } catch (error) {
        throw new Error(error)
    }
};

//ADMIN SEARCH=======================================================
const productSearch = async(req,res)=>{
    try {
  
      const {search} = req.query;
      let page= parseInt(req.query.page) || 1;
      let limit = 6;
      let skip = (page -1)*limit;
      let totalProducts = await productSchema.countDocuments({});
      let totalPages = Math.ceil(totalProducts/limit);

      const categoryData = await categorySchema.find({  categoryName: { $regex: `^${search}`, $options: 'i' } }).skip(skip).limit(limit);
      const  productData = await productSchema.find({
        $or: [
          { name: { $regex: `^${search}`, $options: 'i' } }, 
          { brand: { $regex: `^${search}`, $options: 'i' } }, 
          { gender: { $regex: `^${search}`, $options: 'i' } },
          { $where: `new RegExp('^' + this.mrp).test('${search}')` }

        ]
      });
     

      if(productData &&categoryData&&search){
        res.render("product",{productData,categoryData,totalPages,currentPage:page,search})
      }else{
        res.render("product",{search})
      }
    } catch (error) {
      throw new Error(error)
    }
   
    
  }

module.exports = {
    getProduct,
    createProduct,
    getCreateProduct,
    productList,
    productUnlist,
    getEditProduct,
    editProduct,
    deleteProduct,
    deleteImage,
    productSearch,
    uploadImage

}


