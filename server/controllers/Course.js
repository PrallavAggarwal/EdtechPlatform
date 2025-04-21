const Course = require("../models/Course")
const Category = require("../models/category")
const User = require("../models/User")
const {uploadImageToCloudinary, uploadImageCloudinary} = require('../utils/imageUploader')


//create course handler function
exports.createCourse = async (req, res) => {
    try{
        //fetch details
        const {courseName, courseDescription, whatYouWillLearn, price, category} = req.body

        //get thumbnail
        const thumbnail = req.files.thumbnailImage

        //validation
        if(!courseName || !courseDescription || !whatYouWillLearn || !price || !category){
            return res.status(400).json({
                success:false,
                message:"All fields are required.",
            })
        }

        //check for instructor
        //CHECK THE TYPE OF USERID HERE. IS IT STRING OR OBJECT_TYPE OR WHAT ?
        const userId = req.user.id
        const instructorDetails = await User.findById({_id:userId})
        console.log("instructor Details : ", instructorDetails)
        //todo check instructor id and user id are same

        if(!instructorDetails){
            return res.status(404).json({
                success:false,
                message:"Instructor not found."
            })
        }

        //check given category present or not
        const categoryDetails = await Category.findById(category)
        if(!categoryDetails){
            return res.status(404).json({
                success:false,
                message:"Category Details not found."
            })
        }

        //upload image to cloudinary
        const thumbnailImage = await uploadImageCloudinary(thumbnail, process.env.FOLDER_NAME)

        //CREATe new entry for course
        const newCourse = await Course.create({
            courseName,
            courseDescription,
            instructor:instructorDetails._id,
            whatYouWilllearn:whatYouWillLearn,
            price,
            category:categoryDetails._id,
            thumbnail:thumbnailImage.secure_url
        })

        //update user. add new course to instructor schema
        await User.findByIdAndUpdate(
            {_id: instructorDetails._id},
            {
                $push: {
                    courses: newCourse._id,
                }
            },
            {new:true}
        )

        //update category schema in HW
        //TODO IN HW UPDATE TAG SCHEMA
        await Category.findByIdAndUpdate(
            {_id: categoryDetails._id},
            {
                $push: {
                    courses: newCourse._id,
                }
            },
            {new:true}
        )

        //return response
        return res.status(200).json({
            success:true,
            message:"Course created successfully.",
            data:newCourse
        })

    }
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Failed to create course.",
            error:error.message,
        })
    }
} 

//get all coursers
exports.showAllCourses = async (req, res) => {
    try{
        const allCourses = await Course.find({}, 
            {courseName:true,
            price:true,
            thumbnail:true,
            instructor:true,
            ratingAndReviews:true,
            studentsEnrolled:true,}
        ).populate('instructor').exec()

        return res.status(200).json({
            success:true,
            message:"Data for all courses fetched successfully.",
            data:allCourses
        })
    }
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Failed to display courses.",
            error:error.message,
        })
    }
}

//get course details. u will fetch course id
exports.getCourseDetails = async (req, res) => {
    try{
        const {courseId} = req.body
        if(!courseId){
            return res.status(400).json({
                success:false,
                message:"error while fetching course id."
            })
        }
        const response = await Course.findById(courseId)
        .populate(
            {
                path:"instructor",
                populate:{
                    path:"additionalDetails"
                }
            }
        )
        .populate(
            {
                path:"courseContent",
                populate:{
                    path:"subSection",
                }
            }
        )
        .populate("ratingAndReviews")
        .populate("category")
        .populate(
            {
                path:"studentsEnrolled",
                populate:{
                    path:"courseProgress",
                    path:"courses",
                    path:"additionalDetails"
                }
            }
        )
        .exec()

        if(!response){
            return res.status(400).json({
                success:false,
                message:"failed to fetch response."
            })
        }

        return res.status(200).json({
            success:true,
            message:"course details fetched.",
            response,
        })
    }
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Failed to display courses details.",
            error:error.message,
        })
    }
}