const User = require('../models/User')
const mailSender = require("../utils/mailSender")
const bcrypt = require('bcrypt')

//reset Password Token
exports.resetPasswordToken = async (req , res) => {
    try{
        //get email from req body
        const {email} = req.body
        //check user for this email, email validation
        const user = await User.findOne({email})
        if(!user){
            return res.json({
                success:false,
                message:"User not registered."
            })
        }
        //generate token
        const token = crypto.randomUUID()
        //update user by adding token and expiration time
        const updatedDetails =  await User.findOneAndUpdate({email:email},
            {
                token:token,
                resetPasswordExpires: Date.now() + 50*60*1000
            },
            {new:true}
        )
        //create url
         //link to change password
         const url = `http://localhost:3000/update-password/${token}`

        //send mail containing the url
        await mailSender(email, "Password reset link", `Password reset link : ${url}`)
        //return response 
        return res.json({
            success:true,
            message:"mail sent for password reset."
        })

       
    }
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"something went wrong while password reset."
        })

    }
}

//reset Password
exports.resetPassword = async (req , res) => {
    try{
        //data fetch
        const {password, confirmPassword, token} = req.body
        //validation
        if(password !== confirmPassword){
            return res.json({
                success:false,
                message:'Password not matched.'
            })
        }
        //get user details from db using token
        const userDetails = await User.findOne({token:token})
        //if no entry - invalid tokens
        if(!userDetails){
            return res.json({
                success:false,
                message:"Token is invalid."
            })
        }
        //or token expired
        if(userDetails.resetPasswordExpires < Date.now()){
            return res.json({
                success:false,
                message:"Token is expired, please regenerate your token."
            })
        }
        //hash pwd
        const hashedPassword = await bcrypt.hash(password, 10)
        //password update
        await User.findOneAndUpdate(
            {token:token},
            {password:hashedPassword},
            {new:true},
        )
        //return response
        return res.status(200).json({
            success:true,
            message:"Password updated."
        })
    }   
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"something went wrong while password reset."
        })

    }
}