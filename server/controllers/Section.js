const Section = require('../models/Section')
const Course = require('../models/Course')

exports.createSection = async (req, res) => {
    try{
        //data fetch 
        const {sectionName, courseId} = req.body
        //data validation
        if(!sectionName || !courseId){
            return res.status(400).json({
                success:false,
                message:"missing properties."
            })
        }
        //create section
        const newSection = await Section.create({sectionName})
        //update course with section Object Id
        const updatedCourseDetails = await Course.findByIdAndUpdate(courseId, {
            $push:{
                courseContent:newSection._id,
            }
        }, {new:true}).populate({
            path: "courseContent",
            populate: {
                path: "subSection",
            },
        })
        .exec();
        //HW USE POPULATE TO REPLACE SECTIONS/SUB-SECTION BOTH IN UPDATED-COURSE-DETAILS
        // const updated = await Course.findById(courseId).populate("courseContent")
        // const expampe = updated.courseContent



        //return response
        return res.status(200).json({
            success:true,
            message:"Section created successfully.",
            updatedCourseDetails
        })

    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:"error while creating section."
        })
    }
}

exports.updateSection = async (req, res) => {
    try {
        //data fetch
        const {sectionName, sectionId} = req.body
        //data validation
        if(!sectionName || !sectionId){
            return res.status(400).json({
                success:false,
                message:"missing properties."
            })
        }

        //update data
        const section = await Section.findByIdAndUpdate(sectionId, {
            sectionName
        }, {new:true})
        //return response
        return res.status(200).json({
            success:true,
            message:"section updated successfully."
        })


        
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"error while updating section."
        })
    }
}

//delete section
exports.deleteSection = async (req, res) => {
    try {
        //get Id - assuming that we are sending id in params
        const {sectionId} = req.params
        const {courseId} = req.body
        //use findByIdandDelete
        await Section.findByIdAndDelete(sectionId)
        //TODO DO WE NEED TO DELETE ENTRY FROM THE COURSE SCHEMA
        const response = await Course.findOneAndDelete({courseId,
            courseContent: { $elemMatch: { $eq : sectionId}}
        } )
        console.log(`response after deleting section from course schema : ${response}`)
        //response
        return res.status(200).json({
            success:true,
            message:"section updated successfully."
        })        


    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"error while updating section."
        })
    }
}