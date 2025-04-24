const User = require("../models/User")
const OTP = require("../models/OTP")
const Profile = require("../models/Profile")
const otpGenerator = require('otp-generator')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mailSender = require("../utils/mailSender")
require('dotenv').config()

//otp verify
exports.sendotp = async (req, res) => {
    try{
        //fetch email from request body
        const {email} = req.body

        //check if user already exist 
        const checkUserPresent = await User.findOne({email})

        //if user already exist then return a response
        if(checkUserPresent){
            return res.status(401).json({
                success:false,
                message:"User already exist"
            })
        }

        //generate OTP
        var otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets:false,
            specialChars:false,
        })
        console.log("OTP generated : ", otp)
  
        //check unique otp or not
        var result = await OTP.findOne({otp:otp})
        while(result){
            otp = otpGenerator(6,{
                upperCaseAlphabets: false,
                lowerCaseAlphabets:false,
                specialChars:false,
            })
        }

        //entry of unique otp in db
        const otpPayload = {email, otp}
        //yeh create waali line se pehle otp email pr send hoega due to pre-middleware.
        const otpBody = await OTP.create(otpPayload)
        console.log(otpBody)

        //return response successfully
        res.status(200).json({
            success:true,
            message:"OTP sent successfully.",
            otp,
        })


    }
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"OTP not generated"
        })
    }
}
 



//sign up
exports.signup = async (req,res) => {
    try{
        //data fetch from request body
        const {firstName, lastName, email, password, confirmPassword, accountType, contactNumber, otp} = req.body
        
        //validation
        if(!firstName || !lastName || !email || !password || !confirmPassword || !otp){
            return res.status(403).json({
                success:false,
                message:"All fields are req uired."
            })
        }
        //match both password
        if(password !== confirmPassword){
            return res.status(403).json({
                success:false,
                message:"Passwords should be same."
            })
        }
        //check user already exist or not
        const existingUser = await User.findOne({email})
        if(existingUser){
            return res.status(400).json({
                success:false,
                message:"User already exist."
            })
        } 

        //find most recent otp stored for the same user
        //find({email}) : returns all docs that matches same email.
        //sort({createdAt:-1}) : sorts result according to createdAt field but in descending order(-1).
        //limit(1) : limits the result to one doc.
        const recentOtp = await OTP.find({email : email}).sort({createdAt:-1}).limit(1)
        // const recentOtp = await OTP.find({})
        console.log("recentOtp 5 : ", recentOtp)
        console.log(`otp ${otp} and recentotp ${recentOtp[0].otp}`)
        console.log("email : ", email)

        //validate otp
        if(recentOtp.length == 0){
            //otp not found
            return res.status(400).json({
                success:false,
                message:"OTP not found."
            })
        }
        else if(otp !== recentOtp[0].otp){
            //invalid otp
            return res.status(400).json({
                success:false,
                message:"OTP not matched."
            })
        }

        //hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        //create entry in db
        const profileDetails = await Profile.create({
            gender:null,
            dateOfBirth:null,
            about:null,
            contactNumber:null,
        })
        const user = await User.create({
            firstName,
            lastName,
            email,
            contactNumber,
            password:hashedPassword,
            accountType,
            additionalDetails:profileDetails._id,
            image:`https://api.dicebear.com/9.x/thumbs/svg?seed=${firstName} ${lastName}`
        })

        //return response
        return res.status(200).json({
            success:true,
            message:"User is registered successfully.",
            User,
        })
    }
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"User cannot be registered. Please try again."
        })
    }
}



//login
exports.login = async (req, res) => {
    try{
        //get data from req body
        const {email, password} = req.body
        //validation data
        if(!email || !password){
            return res.status(403)>json({
                success:false,
                message:"All fields are required"
            })
        }
        //user check exist or not
        const user = await User.findOne({email}).populate("additionalDetails")
        if(!user){
            return res.status(401).json({
                success:false,
                message:"User is not registered. Please sign up."
            })
        }
        //generate JWT token after password matching
        if(await bcrypt.compare(password, user.password)){
            const payload = {
                email: user.email,
                id: user._id,
                accountType: user.accountType
            }
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn:"2h"
            })
            user.token = token
            user.password = undefined
            //create cookies and send response
            const options = {
                expires: new Date(Date.now()+ 3*24*60*60*1000),
                httpOnly:true, 
            }
            res.cookie("token", token, options).status(200).json({
                success:true,
                token,
                user,
                message:"Logged in successfully."
            })
        }
        else{
            return res.status(401).json({
                success:false,
                message:"Password is incorrect.",
            })
        }

    }
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Login failure, please try again."
        })
    }
}


//change password
exports.changePassword = async (req, res) => {
    try{
        //get data from req body
        //get oldPassword, newPassword, confirmPassword
        const {email, oldPassword, newPassword, confirmPassword} = req.body
        //validation
        if(!email || !newPassword || !oldPassword || !confirmPassword){
            return res.statsu(400).json({
                success:false,
                message:"All details required."
            })
        }
        const existingUser = await User.findOne({email})
        if(!existingUser){
            return res.status(400).json({
                success:false,
                message:"User not exist."
            })
        }
        if(oldPassword === newPassword){
            return res.status(400).json({
                success:false,
                message:"new password should be different from old password."
            })
        }
        if(confirmPassword !== newPassword){
            return res.status(400).json({
                success:false,
                message:"new password and confirm password must match."
            })
        }
        
        //upadate pwd in db
        const updatedPassword = await User.findOneAndUpdate({email}, {password:updatedPassword},{new:true})
        //send mail - password updated
        await mailSender(email, "Password changed successfully.", "Password changed successfully.")

        //return response
        return res.status(200).json({
            success:true,
            message:"Password changed."
        })
    }
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Password change failure, please try again."
        })
    }
}