const Course = require('../models/Course')
const Profile = require('../models/Profile')
const User = require('../models/User')
const {uploadImageCloudinary} = require('../utils/imageUploader')
require('dotenv').config()

exports.updateProfile = async (req,res) => {
    try {
        //get data
        const {dateOfBirth="", about="", contactNumber, gender} = req.body
        //get userId
        const id = req.user.id
        //validation
        if(!contactNumber || !gender || !id){
            return res.status(400).json({
                success:fasle,
                message:"All fields are required."
            })
        }
        //find profile
        const userDetails = await User.findById(id)
        const profileId = userDetails.additionalDetails
        const profileDetails = await Profile.findById(profileId)

        //update profile
        profileDetails.dateOfBirth = dateOfBirth
        profileDetails.about = about
        profileDetails.gender = gender
        profileDetails.contact = contactNumber
        await profileDetails.save()

        //return response
        return res.status(200).json({
            success:true,
            message:"Profile details updated",
            profileDetails
        })


    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"error while updating profile."
        })   
    }
}

//delete Account
exports.deleteAccount = async (req, res) => {
    try{
        //get id
        const id = req.user.id
        //validation
        const userDetails = await User.findById(id)
        if(!userDetails){
            return res.status(404).json({
                success:false,
                message:"User not found."
            })
        }


        //delete profile
        await Profile.findByIdAndDelete({_id:userDetails.additionalDetails})
        //TODO: HW UNENROLL USER FROM ALL ENROLLED COURSES
        //CRON JOB ?
        //SCHEDULE DELETE REQUEST
        //delete user
        // await User.findByIdAndDelete({_id:id})
        for (const courseId of userDetails.courses) {
            await Course.findByIdAndUpdate(
              courseId,
              { $pull: { studentsEnroled: id } },
              { new: true }
            )
          }
          // Now Delete User
          await User.findByIdAndDelete({ _id: id })

        //return response
        return res.status(200).json({
            success:true,
            message:"USER deleted successfully."
        })
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:"error while deleting details."
        })
    }   
}

//get all details of user
exports.getAllUserDetails = async (req, res) => {
    try {
        //fetch data
        const id = req.user.id
        //validate
        const userDetails = await User.findById(id).populate("additionalDetails").exec()
        //db call to get data
        return res.status(200).json({
            success:true,
            message:"User data fetched successfully.",
            userDetails
        })
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}

exports.updateDisplayPicture = async (req, res) => {
    try {
      console.log('inside update display picture')
      const displayPicture = req.files.displayPicture
      const userId = req.user.id
      const image = await uploadImageCloudinary(
        displayPicture,
        process.env.FOLDER_NAME,
        1000,
        1000
      )
      console.log(`image for update profile : ${image}`)
      const updatedProfile = await User.findByIdAndUpdate(
        { _id: userId },
        { image: image.secure_url },
        { new: true }
      )
      res.send({
        success: true,
        message: `Image Updated successfully`,
        data: updatedProfile,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
  }
  
exports.getEnrolledCourses = async (req, res) => {
    try {
      const userId = req.user.id
      let userDetails = await User.findOne({
        _id: userId,
      })
        .populate({
          path: "courses",
          populate: {
            path: "courseContent",
            populate: {
              path: "subSection",
            },
          },
        })
        .exec()
      userDetails = userDetails.toObject()
      var SubsectionLength = 0
      for (var i = 0; i < userDetails.courses.length; i++) {
        let totalDurationInSeconds = 0
        SubsectionLength = 0
        for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {
          totalDurationInSeconds += userDetails.courses[i].courseContent[
            j
          ].subSection.reduce((acc, curr) => acc + parseInt(curr.timeDuration), 0)
          userDetails.courses[i].totalDuration = convertSecondsToDuration(
            totalDurationInSeconds
          )
          SubsectionLength +=
            userDetails.courses[i].courseContent[j].subSection.length
        }
        let courseProgressCount = await CourseProgress.findOne({
          courseID: userDetails.courses[i]._id,
          userId: userId,
        })
        courseProgressCount = courseProgressCount?.completedVideos.length
        if (SubsectionLength === 0) {
          userDetails.courses[i].progressPercentage = 100
        } else {
          // To make it up to 2 decimal point
          const multiplier = Math.pow(10, 2)
          userDetails.courses[i].progressPercentage =
            Math.round(
              (courseProgressCount / SubsectionLength) * 100 * multiplier
            ) / multiplier
        }
      }
  
      if (!userDetails) {
        return res.status(400).json({
          success: false,
          message: `Could not find user with id: ${userDetails}`,
        })
      }
      return res.status(200).json({
        success: true,
        data: userDetails.courses,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
  }
  
exports.instructorDashboard = async (req, res) => {
    try {
      const courseDetails = await Course.find({ instructor: req.user.id })
  
      const courseData = courseDetails.map((course) => {
        const totalStudentsEnrolled = course.studentsEnroled.length
        const totalAmountGenerated = totalStudentsEnrolled * course.price
  
        // Create a new object with the additional fields
        const courseDataWithStats = {
          _id: course._id,
          courseName: course.courseName,
          courseDescription: course.courseDescription,
          // Include other course properties as needed
          totalStudentsEnrolled,
          totalAmountGenerated,
        }
  
        return courseDataWithStats
      })
  
      res.status(200).json({ courses: courseData })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server Error" })
    }
  }