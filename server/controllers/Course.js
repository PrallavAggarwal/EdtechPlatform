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
exports.getAllCourses = async (req, res) => {
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

//edit course
exports.editCourse = async (req, res) => {
    try {
      const { courseId } = req.body
      const updates = req.body
      const course = await Course.findById(courseId)
  
      if (!course) {
        return res.status(404).json({ error: "Course not found" })
      }
  
      // If Thumbnail Image is found, update it
      if (req.files) {
        console.log("thumbnail update")
        const thumbnail = req.files.thumbnailImage
        const thumbnailImage = await uploadImageToCloudinary(
          thumbnail,
          process.env.FOLDER_NAME
        )
        course.thumbnail = thumbnailImage.secure_url
      }
  
      // Update only the fields that are present in the request body
      for (const key in updates) {
        if (updates.hasOwnProperty(key)) {
          if (key === "tag" || key === "instructions") {
            course[key] = JSON.parse(updates[key])
          } else {
            course[key] = updates[key]
          }
        }
      }
  
      await course.save()
  
      const updatedCourse = await Course.findOne({
        _id: courseId,
      })
        .populate({
          path: "instructor",
          populate: {
            path: "additionalDetails",
          },
        })
        .populate("category")
        .populate("ratingAndReviews")
        .populate({
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        })
        .exec()
  
      res.json({
        success: true,
        message: "Course updated successfully",
        data: updatedCourse,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      })
    }
}

//get full course details
exports.getFullCourseDetails = async (req, res) => {
    try {
      const { courseId } = req.body
      const userId = req.user.id
      const courseDetails = await Course.findOne({
        _id: courseId,
      })
        .populate({
          path: "instructor",
          populate: {
            path: "additionalDetails",
          },
        })
        .populate("category")
        .populate("ratingAndReviews")
        .populate({
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        })
        .exec()
  
      let courseProgressCount = await CourseProgress.findOne({
        courseID: courseId,
        userId: userId,
      })
  
      console.log("courseProgressCount : ", courseProgressCount)
  
      if (!courseDetails) {
        return res.status(400).json({
          success: false,
          message: `Could not find course with id: ${courseId}`,
        })
      }
  
      // if (courseDetails.status === "Draft") {
      //   return res.status(403).json({
      //     success: false,
      //     message: `Accessing a draft course is forbidden`,
      //   });
      // }
  
      let totalDurationInSeconds = 0
      courseDetails.courseContent.forEach((content) => {
        content.subSection.forEach((subSection) => {
          const timeDurationInSeconds = parseInt(subSection.timeDuration)
          totalDurationInSeconds += timeDurationInSeconds
        })
      })
  
      const totalDuration = convertSecondsToDuration(totalDurationInSeconds)
  
      return res.status(200).json({
        success: true,
        data: {
          courseDetails,
          totalDuration,
          completedVideos: courseProgressCount?.completedVideos
            ? courseProgressCount?.completedVideos
            : [],
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
  }

//get instructor course
exports.getInstructorCourses = async (req, res) => {
    try {
      // Get the instructor ID from the authenticated user or request body
      const instructorId = req.user.id
  
      // Find all courses belonging to the instructor
      const instructorCourses = await Course.find({
        instructor: instructorId,
      }).sort({ createdAt: -1 })
  
      // Return the instructor's courses
      res.status(200).json({
        success: true,
        data: instructorCourses,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({
        success: false,
        message: "Failed to retrieve instructor courses",
        error: error.message,
      })
    }
  }

//delete course
exports.deleteCourse = async (req, res) => {
    try {
      const { courseId } = req.body
  
      // Find the course
      const course = await Course.findById(courseId)
      if (!course) {
        return res.status(404).json({ message: "Course not found" })
      }
  
      // Unenroll students from the course
      const studentsEnrolled = course.studentsEnroled
      for (const studentId of studentsEnrolled) {
        await User.findByIdAndUpdate(studentId, {
          $pull: { courses: courseId },
        })
      }
  
      // Delete sections and sub-sections
      const courseSections = course.courseContent
      for (const sectionId of courseSections) {
        // Delete sub-sections of the section
        const section = await Section.findById(sectionId)
        if (section) {
          const subSections = section.subSection
          for (const subSectionId of subSections) {
            await SubSection.findByIdAndDelete(subSectionId)
          }
        }
  
        // Delete the section
        await Section.findByIdAndDelete(sectionId)
      }
  
      // Delete the course
      await Course.findByIdAndDelete(courseId)
  
      return res.status(200).json({
        success: true,
        message: "Course deleted successfully",
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      })
    }
  }