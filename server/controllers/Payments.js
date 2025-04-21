const {instance} = require('../config/razorpay')
const Course = require('../models/Course')
const User = require('../models/User')
const mailSender = require('../utils/mailSender')
const {courseEnrollmentEmail} = require('../mail/templates/couresEnrollmentEmail')



//capture the payment and initiate the razorpay order
exports.capturePayment = async (req, res) => {
    //get course id and user id
    const {course_id} = req.body
    const userId = req.user.id
    //validations
    //valid course id
    if(!course_id){
        return res.json({
            success:false,
            message:"Please provide valid course Id."
        })
    }
    //valid course details
    let course
    try{
        course = await Course.findById(course_id)
        if(!course){
            return res.json({
                success:false,
                message:"could not find the course."
            })
        }
        //user already pay for the same course
        //user id fetched is string but should be stored as object id so it is converted to objectid
        const uid = new mongoose.Types.ObjectId(userId)
        if(course.studentsEnrolled.includes(uid)){
            return res.status(200).json({
                success:false,
                message:"Student is already enrolled."
            })
        }
    }
    catch(error){
        console.error(error)
        return res.status(500).json({
            success:false,
            message:error.message
        })
    }

    //order create 
    const amount = course.price
    const currency = "INR"

    const options = {
        amount: amount*100,
        currency,
        receipt:Math.random(Date.now()).toString(),
        notes:{
            courseId:course_id,
            userId,
        }
    }
    try{
        //initiate the payment using razorpay
        const paymentResponse = await instance.orders.create(options)
        console.log(paymentResponse)
        //return response
        return res.status(200).json({
            success:true,
            courseName:course.courseName,
            courseDescription:course.courseDescription,
            thumbnail:course.thumbnail,
            orderId: paymentResponse.id,
            currency:paymentResponse.currency,
            amount:paymentResponse.amount
        })
    }
    catch(error){
        console.log(error)
        res.json({
            success:false,
            message:"could not initiate order."
        })
    }
    //return response
}


//verify signature
exports.verifySignature = async (req, res) => {
    //webhoookSecret stored on server
    const webhookSecret = "12345678"

    //signature ffrom razorpay
    const signature = req.headers("x-razorpay-signature")

    const shasum = crypto.createHmac("sha256", webhookSecret)
    shasum.update(JSON.stringify(req.body))
    const digest = shasum.digest("hex")

    if(digest === webhookSecret){
        console.log("Payment is authorized")

        const{courseId, userId} = req.body.payload.payment.entity.notes
        try {
            //fulfill the action

            //find the course and enroll student
            const enrolledCourse = await Course.findOneAndUpdate({_id: courseId}, 
                {$push:{studentsEnrolled: userId}},
                {new:true}
            )

            if(!enrolledCourse){
                return res.status(500).json({
                    success:false,
                    message:""
                })
            }

            console.log(enrolledCourse)

            //find the student and add the course to their list enrolled courses me
            const enrolledStudent = await User.findOneAndUpdate({_id:userId},{$push:{courses:courseId}}, {new:true})

            console.log(enrolledCourse)

            //mail send krna
            const emailResponse = await mailSender(enrolledStudent.email,
                "payment success.",
                "congratulation you added in course."
            )
            console.log(emailResponse)
            return res.status(200).json({
                success:true,
                message:"signature verified and course added."
            })

        } catch (error) {
            console.log(error)
            return res.status(500).json({
                success:false,
                message:error.message,
            })
        }
    }
    else{
        return res.status(400).json({
            success:false,
            message:"could find the course."
        })
    }
}