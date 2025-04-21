const RatingAndReview = require('../models/RatingAndReview')
const Course = require('../models/Course')

//create Rating and Reviews
exports.createRating = async (req, res ) => {
    try {
        //get user id
        const {userId} = req.user.id
        //fetch data from user id
        const {rating, review, courseId} = req.body
        //check if user is enrolled or not
        const courseDetails = await Course.findOne({_id:courseId,
            studentsEnrolled: {$elemMatch: {$eq: userId}}
        })
        if(!courseDetails){
            return res.status(404).json({
                success:false,
                message:"course details not found."
            })
        }
        //check if user already reviewed or not
        const alreadyReviewed = await RatingAndReview.findOne({user:userId, course:courseId})
        if(alreadyReviewed){
            return res.status(403).json({
                success:false,
                message:"Course is already reviewed by the user."
            })
        }
        //create rating and review
        const ratingReview = await RatingAndReview.create({
            rating, review,
            course:courseId,
            user:userId,
        })
        //update course with rating and review
        const updatedCourseDetails = await Course.findByIdAndUpdate({_id:courseId},
            {
                $push:{
                    ratingAndReviews: ratingReview._id,
                }
            },
            {new:true}
        )
        console.log("updatedCourseDetails with rating and review : ", updatedCourseDetails)
        //generate response
        return res.status(200).json({
            success:true,
            message:"Rating and review added.",
            ratingReview
        })
    } catch (error) {
            console.log(error)
            return res.status(500).json({
                success:false,
                message:"Failed to reviews and rating.",
                error:error.message,
            })
    }
}

//get average rating
exports.getAverageRating = async (req, res ) => {
    try {
        //get user id
        const courseId = req.body.courseId

        //calculate average rating
        const result = await RatingAndReview.aggregate([
            {
                $match:{
                    course: new mongoose.Types.ObjectId(courseId),
                },
            },
            {
                $group:{
                    _id:null,
                    averageRating: {$avg: "$rating"}
                }
            }
        ])
        console.log("result of average rating : ", result)
        //return rating
        if(result.length > 0){
            return res.status(200).json({
                success:true,
                message:"rating fetched.",
                average_rating:result[0].averageRating,
            })
        }

        //if no rating or review
        return res.status(200).json({
            success:true,
            message:"Average Rating is O, no ratings till now.",
            average_rating:0
        })
    } catch (error) {
        console.log(error)
            return res.status(500).json({
                success:false,
                message:"Failed to reviews and rating.",
                error:error.message,
            })   
    }
}

//HW RETURN COURSE SPECIFIC RATING & REVIEWS
exports.getCourseSpecificRating = async (req, res) => {
    try {
        const {courseId} = req.body
        if(!courseId){
            return res.status(400).json({
                success:false,
                messagae:"course not found."
            })
        }
        //fetch rating and review from rating and review schema
        const ratingReview = await RatingAndReview.find({course:courseId}).populate('course')
        if(!ratingReview){
            return res.status(400).json({
                success:false,
                message:"This course has no rating and reviews yet."
            })
        }
        console.log(`course specific rating : ${ratingReview}`)
        return res.status(200).json({
            success:true,
            message:"rating and reviews for the course is fetched.",
            ratingReview
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Failed to get reviews and rating related to the course.",
            error:error.message,
        })   
    }
}

//get all rating and reviews
exports.getAllRating = async (req, res) => {
    try {
        const allReviews = await RatingAndReview.find({})
        .sort({rating: "desc"})
        .populate({
            path:"user",
            select:"firstName lastName email image",
        })
        .populate({
            path:"course",
            select:"courseName",
        })
        .exec()

        //return response
        return res.status(200).json({
            success:true,
            message:"All reviews fetched successfully.",
            data:allReviews
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Failed to get all reviews and rating.",
            error:error.message,
        })   
    }
}