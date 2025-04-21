# Pre/Post middleware 
- For otp we will use pre middleware.
- in otp model we will use pre middleware to send mail for otp.
- Entry of user in db will be done after otp verification only.

# revise otp

# revise middlewares

# populate()
- `populate({
    path:"",
    populate:{
        path:"",
    }
})`
- one doubt ! can we use multiple paths in this populate. like this : `.populate(
            {
                path:"studentsEnrolled",
                populate:{
                    path:"courseProgress",
                    path:"courses",
                    path:"additionalDetails"
                }
            }
        )`

# query 
- studentsEnrolled:` {$elemMatch: {$eq: userId}} `
    ## Average Rating query
    - `const result = await RatingAndReview.aggregate([
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
        ])`
    - result is in form of an array.
    - average_rating:result[0].averageRating
- query to show only specific fields :
    - `const allReviews = await RatingAndReview.find({})
        .sort({rating: "desc"})
        .populate({
            path:"user",
            select:"firstName lastName email image",
        })
        .populate({
            path:"course",
            select:"courseName",
        })
        .exec()`

- `findOneAndUpdate({email}, {password:updatedPassword},{new:true})`
- `findById({parameter:parameter})`
- `findById(parameter)`
- ` Category.findByIdAndUpdate(
            {_id: categoryDetails._id},
            {
                $push: {
                    courses: newCourse._id,
                }
            },
            {new:true}
        )`
- `const allCourses = await Course.find({}, 
            {courseName:true,
            price:true,
            thumbnail:true,
            instructor:true,
            ratingAndReviews:true,
            studentsEnrolled:true,}
        ).populate('instructor').exec()`

