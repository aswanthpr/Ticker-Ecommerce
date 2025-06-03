const cloudinary = require('../../config/cloudinary')
const productSchema = require("../../models/productModel");
const categorySchema = require("../../models/categoryModel");
const orderSchema = require("../../models/orderModel");
const mongoose = require("mongoose")
const { Readable } = require('stream');
//GET PRODUCT=================================================
const getProduct = async (req, res, next) => {
    try {
        const { search } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;
        const totalProducts = await productSchema.countDocuments({});
        const totalPages = Math.ceil(totalProducts / limit);
        let searcher = {}
        if (search) {
            searcher = {
                $or: [
                    { name: { $regex: `^${search}`, $options: 'i' } },
                    { brand: { $regex: `^${search}`, $options: 'i' } },
                    { gender: { $regex: `^${search}`, $options: 'i' } },


                ]
            }
        }
        const productData = await productSchema.find(searcher).populate({ path: "category", model: "category", select: "categoryName" }).sort({ createdAt: -1 }).skip(skip).limit(limit);

        return res.render("product", { productData, currentPage: page, totalPages, search, cloudinaryBase: process.env?.CLOUDINARY_SECURE_URL });

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

//GET CREATE PRODUCT==================================
const getCreateProduct = async (req, res, next) => {
    try {
        const categoryData = await categorySchema.find({ status: true })

        res.render("createProducts", { categoryData })
    } catch (error) {
        console.log(error.message);
        next(error)
    }
}
//ADD PRODUCT ===========================================

const createProduct = async (req, res, next) => {
    try {


        const { name, subtitle, mrp, brand, stock, category, gender, color } = req.body;

        if (!name || !subtitle || !mrp || !brand || !stock || !category || !gender || !color) {
            return res.json({ success: false, message: "All fields are required" });
        }

        if (!req.files || req.files.length === 0) {
            return res.json({ success: false, message: "image files required " });
        }


        // const images = req.files.map(file => file.filename);

        console.log('1111111111111111')
        const uploadPromises = req.files.map(async (file) => {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'ticker',
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result)
                    }
                )
                const bufferStream = Readable.from(file?.buffer);
                bufferStream.on('error', (error) => {

                    reject(error);
                });

                bufferStream.pipe(uploadStream)
                    .on('error', (error) => {

                        reject(error);
                    });

            });

        })
        const result = await Promise.all(uploadPromises)
        const images = result.map((obj) => obj.secure_url);
        console.log(result, 'thei si the result', images)

        const categoryObj = await categorySchema.findOne({ categoryName: category });
        const productData = await productSchema.findOne({ name: name, gender: gender, category: categoryObj._id });


        if (productData) {
            console.log('400')
            return res.status(400).json({ success: false, message: 'Product already exists' });
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

            await newProduct.save();
            console.log('200')
            return res.status(200).json({ success: true, message: "Product successfully inserted" });

        }

    } catch (error) {

        console.log(error.message);
        next(error)
    }
}

//LIST AND UNLIST  PRODUCT ===========================================

const productList = async (req, res, next) => {
    try {
        const id = req.params.id;


        const list = await productSchema.updateOne({ _id: id }, { $set: { status: true } });
        if (list) {

            res.status(200).json({ message: "Category listed successfully" });

        } else {
            res.status(404).json({ message: "Product not found or could not be listed" })
        }

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

const productUnlist = async (req, res, next) => {
    try {
        const id = req.params.id;

        const unlist = await productSchema.updateOne({ _id: id }, { $set: { status: false } })
        if (unlist) {

            res.status(200).json({ message: " " });

        } else {
            res.status(404).json({ message: "Product not found or could not be unlisted" });
        }

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

const getEditProduct = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.redirect('/admin/product')
        }
        const proData = await productSchema.find({ _id: id }).populate('category')
        const category = await categorySchema.find({})

        res.render("editProducts", { proData, category })

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

const uploadImage = async (req, res, next) => {
    try {

        const { prodId } = req.params

        console.log(prodId, 'this is productId',)
        const file = req.files[0]
        if (!file) {
            return res.status(400).json({ success: false, message: 'No file found' });
        }
        // const newImages = req.files.map(file => file.filename);

        const stream = cloudinary.uploader.upload_stream(
            { folder: 'ticker' },
            async (error, result) => {
                if (error) return next(error);
                console.log(result,'result')
                const updatedProduct = await productSchema.findByIdAndUpdate(prodId, { $push: { image: result?.secure_url } } , { new: true })

                if (updatedProduct) {
                    res.json({ success: true});
                } else {
                    res.status(404).json({ success: false, message: 'Product not found' });
                }
            }
        );

        stream.end(req.files[0].buffer);
        return
        // console.log(newImages,'new imagess')
        // if(newImages.length>0){
        //        const dataCheck =  await productSchema.findByIdAndUpdate(prodId,{$push:{image:{$each:newImages}}})
        //   console.log(dataCheck,'this is data check')
        //        if(dataCheck){

        //     return res.json({success:true})
        //    }
        //     }

    } catch (error) {
        console.log(error.message);
        next(error)
    }
}
const editProduct = async (req, res, next) => {
    try {
        const { prodId } = req.params;

        console.log(prodId, 'this is productId')
        const { name, subtitle, mrp, brand, stock, category, gender, color } = req.body
        const existingProduct = await productSchema.findOne({ name: name, _id: { $ne: prodId } })

        const categoryData = await categorySchema.findOne({ categoryName: category })

        // const newImages = req.files.map(file => file.filename);

        if (existingProduct) {
            return res.status(400).json({ error: true, message: "A product with the same name already exists." });
        } else {
            // if(newImages.length>0){
            //     await productSchema.findByIdAndUpdate({_id:prodId},{$push:{image:{$each:newImages}}})
            // }


            await productSchema.findByIdAndUpdate(prodId,
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
                }, { new: true })


            res.status(200).json({ success: true, message: "product updated successfully" })
        }


    } catch (error) {

        console.log(error.message);
        next(error)
    }
}
const deleteImage = async (req, res, next) => {
    try {
        const { id, imageId } = req.query;

        const response = await productSchema.findOneAndUpdate(
            { _id: id },
            { $pull: { image: imageId } },
            { new: true }
        )
        if (response) {
            res.status(200).json({ success: true, message: 'image deleted  successfully' })

        } else {
            res.status(400).json({ success: false, message: 'image is not found in products or product not found' })
        }
    } catch (error) {
        console.log(error.message);
        next(error)

    }
}

const deleteProduct = async (req, res, next) => {
    try {
        const { productId } = req.body;


        let checkProduct = await orderSchema.find({
            orderedItems: {
                $elemMatch: {
                    productId: new mongoose.Types.ObjectId(productId)
                }
            }
        });



        if (checkProduct.length > 0) {
            return res.status(400).json({ success: false, message: "Product is ordered and cannot be deleted" });
        } else {

            const deleted = await productSchema.findByIdAndDelete({ _id: productId })

            if (deleted) {
                return res.status(200).json({ success: true, message: "Product deleted successfully" });
            } else {
                return res.status(404).json({ success: false, message: "Product not found" });
            }
        }

    } catch (error) {
        console.log(error.message);
        next(error)
    }
};

//ADMIN SEARCH=======================================================
const productSearch = async (req, res, next) => {
    try {

        const { search } = req.query;
        let page = parseInt(req.query.page) || 1;
        let limit = 6;
        let skip = (page - 1) * limit;
        let totalProducts = await productSchema.countDocuments({});
        let totalPages = Math.ceil(totalProducts / limit);

        const categoryData = await categorySchema.find({ categoryName: { $regex: `^${search}`, $options: 'i' } }).skip(skip).limit(limit);
        const productData = await productSchema.find({
            $or: [
                { name: { $regex: `^${search}`, $options: 'i' } },
                { brand: { $regex: `^${search}`, $options: 'i' } },
                { gender: { $regex: `^${search}`, $options: 'i' } },
                { $where: `new RegExp('^' + this.mrp).test('${search}')` }

            ]
        });


        if (productData && categoryData && search) {
            res.render("product", { productData, categoryData, totalPages, currentPage: page, search })
        } else {
            res.render("product", { search })
        }
    } catch (error) {
        console.log(error.message);
        next(error)
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


