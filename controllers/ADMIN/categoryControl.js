const mongoose = require("mongoose");
const categorySchema = require("../../models/categoryModel");
const productSchema = require('../../models/productModel');
const categoryofferSchema = require('../../models/categoryOfferModel')


//GET CATEGORY================================================
const getCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const totalOrders = await categorySchema.countDocuments({});
    const totalPages = Math.ceil(totalOrders / limit);



    const categoryData = await categorySchema.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);


    res.render("category", { categoryData, currentPage: page, totalPages });


  } catch (error) {

    console.log(error.message + " error while get category detailes");

  }
}

const addCategory = async (req, res) => {
  try {

    const name = req.body.name.trim().toUpperCase()

    //    const nameRegex = new RegExp(`^${Name}$`,`i`)

    const existingCategory = await categorySchema.findOne({ categoryName: name });

    if (!(existingCategory?.categoryName)) {

      const newCategory = new categorySchema({ categoryName: name });

      const saveData = await newCategory.save();

      if (saveData) {


        res.status(200).json({ message: "category added successfully" })

      };

    } else {

      res.json({ message: "category already exist " })

    }

  } catch (error) {

    console.log(error.message + " error while add new category detailes")

  }
}
//UNLIST CATEGORY
const unlistCategory = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id + " params id unlist");
    await categorySchema.findByIdAndUpdate({ _id: id }, { $set: { status: false } });
    res.status(200).json({ message: "Category unlisted successfully" });
  } catch (error) {
    console.log(error.message + " error while unlisting category");
    res.status(500).json({ error: "Internal server error" });
  }
}

const listCategory = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id + " params list");
    await categorySchema.findByIdAndUpdate({ _id: id }, { $set: { status: true } });
    res.status(200).json({ message: "Category listed successfully" });
  } catch (error) {
    console.log(error.message + " error while listing category");
    res.status(500).json({ error: "Internal server error" });
  }
}

const editCategory = async (req, res) => {
  try {
    const { categoryId, categoryName } = req.body;
    console.log("Received categoryId:", categoryId);
    console.log("Received categoryName:", categoryName);

    const uniqueCategory = categoryName.trim().toUpperCase().replace(/[^A-Z]+/g, '');

    const existingChecking = await categorySchema.findOne({ categoryName: uniqueCategory });
    console.log("Existing category:", existingChecking);

    if (existingChecking) {
      console.log("Category name is not unique");
      res.json({ error: 'Category name is not unique' });
    } else {
      const updatedCategory = await categorySchema.findByIdAndUpdate(categoryId, { categoryName: uniqueCategory }, { new: true });
      console.log("Updated category:", updatedCategory);
      res.json({ success: 'Category successfully updated' });
    }
  } catch (err) {
    console.error('Error updating category in backend:', err);
    res.status(500).json({ error: 'Error updating category in backend' });
  }
};

//  DELETE CATEGORY
const deleteCategory = async (req, res) => {
  try {
    const categId = req.params.id;
   
    const deleted = await categorySchema.findByIdAndDelete({ _id: categId });

    if (deleted) {

      const deleteProducts = await productSchema.deleteMany({ category: new mongoose.Types.ObjectId(categId) });
      const categoryDel = await categoryofferSchema.deleteMany({categoryId:new mongoose.Types.ObjectId(categId)})
     
      res.redirect("/admin/category")
    
    }

  } catch (error) {
    throw new Error(error);
  }
}


const categSearch = async (req, res) => {
  try {

    const { search } = req.query
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const totalCategory = await categorySchema.countDocuments({});
    const totalPages = Math.ceil(totalCategory / limit);

    const categoryData = await categorySchema.find({ categoryName: { $regex: `^${search}`, $options: 'i' } }).skip(skip).limit(limit)
    if (categoryData) {
      res.render("category", { categoryData, totalPages, currentPage: page, search })
    } else {
      res.render("category", { search })
    }
  } catch (error) {
    throw new Error(error)
  }


}
module.exports = {
  getCategory,
  addCategory,
  listCategory,
  unlistCategory,
  editCategory,
  deleteCategory,
  categSearch
}
