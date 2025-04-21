const { contactUsEmail } = require("../mail/templates/contactFormRes")
const Category = require("../models/category")
const mailSender = require("../utils/mailSender")


//create tag controller
exports.createCategory = async (req , res) => {
    try{
        //fetch data
        const {name, description} = req.body
        //validation
        if(!name || !description){
            return res.status(400).json({
                success:true,
                message:"All fields are required."
            })
        }
        //create entry in db
        const categoryDetails = await Category.create({
            name:name,
            description:description,
        })
        console.log(categoryDetails)
        //return response
        return res.status(200).json({
            success:true,
            message:"Category created Successfully."
        })
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}

//get all tags
exports.showAllCategory = async (req,res) => {
    try{
        const allCategory = await Category.find({}, {name:true, description:true})
        res.status(200).json({
            success:true,
            message:"All tags displayed.",
            allCategory,
        })
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}

//category page details
exports.categoryPageDetails = async (req, res) => {
    try {
        //get categoryId
        const {categoryId} = req.body
        //get courses for specified categoryId
        const selectedCategory = await Category.findById(categoryId)
        .populate("courses")
        .exec()

        //validation
        if(!selectedCategory){
            return res.status(404).json({
                success:false,
                message:"Data not found",
            })
        }

        //get courses for different categories
        const differentCategories = await Category.find({
            _id: {$ne : categoryId},
        })
        .populate("courses")
        .exec()

        //get top 10 selling numbers
        //HW - WRITE IT OWN YOUR OWN


        //return response
        return res.status(200).json({
            success:true,
            data:{
                selectedCategory,
                differentCategories
            }
        })
    } catch (error) {
        console.log("error while getting category page details : ", error)
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}

//contact handler
exports.contactHandler = async (req, res) => {
    try {
        //fetch all details
        const {firstname, lastname, email, message, contactno} = req.body
        //send mail
        await mailSender(email, `Feedback from ${firstname} ${lastname}`, contactUsEmail(firstname, lastname, email, message, contactno) ) 
        //generate response
        return res.status(400).json({
            success:true,
            message:"message sent to gmail."
        })

    } catch (error) {
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}