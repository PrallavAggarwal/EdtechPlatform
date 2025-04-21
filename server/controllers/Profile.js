const Course = require('../models/Course')
const Profile = require('../models/Profile')
const User = require('../models/User')

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
            message:"User data fetched successfully."
        })
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}