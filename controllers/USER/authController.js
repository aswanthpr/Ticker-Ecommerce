const userSchema = require("../../models/userModel");
const regOtp = require("../../models/userOtpverify");
const walletSchema = require('../../models/walletModel');
const router = require("../../routes/userRouter")
const dotEnv = require("dotenv"); dotEnv.config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const otpGen = require("otp-generator");




//REFERRAL GENERATOR==================================================
function referralGenerator() {
  try {
    const referralGen = otpGen.generate(6, {
      upperCaseAlphabets: true,
      lowerCaseAlphabets: true,
      specialChars: false,
    });
    return referralGen;
  } catch (error) {
    throw new Error(error.message)
  }
}

// NODE MAILER=======================================================

const sendOtpMail = async (name, email, Otp) => {
  try {

    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: true,
      auth: {
        user: process.env.NODE_MAILER_EMAIL,
        pass: process.env.NODE_MAILER_PASS,
      },
    });

    const mailOptions = {
      from: process.env.NODE_MAILER_EMAIL,
      to: email,
      subject: `Ticker verification`,

      html: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
      <div style="margin:50px auto;width:70%;padding:20px 0">
        <div style="border-bottom:1px solid #eee">
          <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Ticker</a>
        </div>
        <p style="font-size:1.1em">Hi, ${name}</p>
        <p>Thank you for choosing Ticker watch store. Use the following OTP to complete your Verificaton process. OTP is valid for 1 minutes</p>
        <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${Otp}</h2>
        <p style="font-size:0.9em;">Regards,<br />Ticker</p>
        <hr style="border:none;border-top:1px solid #eee" />
        <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
          <p>Project by Aswanth pr</p>
        </div>
      </div>
    </div>`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        throw new Error(error.message)
      } else {
        console.log("mail has been send:", info.response);
      }
    });
  } catch (error) {
    throw new Error(error.message)
    
  }
};


//OTP GENERATOR=========================================================

function generateOtp() {
  try {
    const otp = otpGen.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
    return otp;
  } catch (error) {
    throw new Error(error.message)
  }
}


//GET SIGNUP=============================================================

const getSignup = async (req, res) => {
  try {
    const referral = req.query.referral;

   

    res.render("signup", { referral });

  } catch (error) {

    throw new Error(error.message)

  }
};

//POST SIGNUP==========================================================

const postSignup = async (req, res) => {

  try {

    const { name, phone, email, password, referral, confirmPassword } = req.body;

    //checking is it existing referral

    const existingReferral = await userSchema.findOne({ referral: referral });

    //checking user exist or not

    const existingUser = await userSchema.findOne({ $or: [{ email }, { phone }] });


    if (existingUser) {

      return res.render('/signup',{ message: "user already exist with this email or phone number" })


    } else {

      if (password === confirmPassword) {

        //password hashing using bcrypt
        const hashPassword = await bcrypt.hash(password, 10);

        const hashConfirmPassword = await bcrypt.hash(confirmPassword, 10);

        req.session.name = name
        req.session.email = email
        req.session.phone = phone
        req.session.password = hashPassword
        req.session.referredBy = existingReferral?.referral


        const randomOtp = generateOtp();

      

        const otpSend = await sendOtpMail(name, email, randomOtp)

        const newOtp = new regOtp({

          email: email,
          otp: randomOtp,
        });

         await newOtp.save();

        return res.redirect(`/verify-otp?email=${email}`)

      } else {

        return res.json({ message3: "password incorrect" })
      }

    }

  } catch (error) {

    throw new Error(error.message)
  }
};



//GET VERIFY OTP=========================================================
const getOtpVerify = async (req, res) => {
  try {


    res.render("verifyOtp");

  } catch (error) {

    throw new Error(error.message)
  }
};

//POST VERIFY OTP===================================================
const postOtpVerify = async (req, res) => {
  try {

    const { otp } = req.body;
    const Name = req.session.name
    const Email = req.session.email
    const Phone = req.session.phone
    const Password = req.session.password
    const Referred = req.session.referredBy


    const otpData = await regOtp.findOne({ email: Email });

   

    if (otpData) {


      if (otpData.otp === otp) {

        const referralCode = referralGenerator();

        const user = new userSchema({
          name: Name,
          email: Email,
          phone: Phone,
          password: Password,
          referral: referralCode,
          referredBy: Referred,
          isVerified: true,
        });

        const userData = await user.save();

        const userDB = await userSchema.findOne({ referral:Referred});
       
        if (userDB) {
          const walletDB = await walletSchema.findOneAndUpdate({ userId: userDB._id },
            {
              $inc: { balance: 100 },
              $push: {
                history: {
                  createTime: new Date(),
                  amount: 100,
                  transactionType: "Credit",
                  discription: `${Name}'s Refrral Bonus`
                }
              }
            },
            { upsert: true });

          

          
            const userCrdit = await walletSchema.findOneAndUpdate(
              { userId:userData._id },
              {
                $inc: { balance: 50 },
                $push: {
                  history: {
                    createTime: new Date(),
                    amount: 50,
                    transactionType:"Credit",
                    discription:"Referree Bonus"
                  }
                }
              },
              { upsert: true });

           
          
        }


        // const token = generateJwtToken(user._id)
        req.session.user = userData._id
        req.session.email = Email

        res.redirect("/");

      } else {
       
        res.redirect(`/verify-otp?email=${Email}`);
      }
    } else {
      res.json({ message: "otp expired" })
    }



  } catch (error) {
    throw new Error(error.message)
  }
};



//RESEND OTP=================================================================

const resendOtp = async (req, res) => {

  try {
    
    const userData = await userSchema.findOne({ email: req.session.email || req.query.email });
    const otpData = await regOtp.findOne({ email: req.session.email || req.query.email });


    if (!(otpData)) {

      const randomOtp = generateOtp();
     

      await sendOtpMail(" User", req.query.email || req.session.email, randomOtp)

      const newOtp = new regOtp({
        email: userData.email,
        otp: randomOtp,
      });

      await newOtp.save();
      res.json({ success: true, message: "OTP generated successfully" })

    } else {
      res.json({ success: false, message: 'OTP exist try again' })
    
    }
  } catch (error) {

    res.status(500).json({ success: false, message: "Internal server error" })
    throw new Error(error.message)
  }


}

//GET LOIGN===============================================================
const getLogin = async (req, res) => {
  try {
    const userData = await userSchema.find({ isVerified: false }) 
    if (userData) {
      if (userData.isVerified === false) {
         await userSchema.deleteMany({ isVerified: false })
      }  
    }
    res.render("login");

  } catch (error) {
    throw new Error(error)
  }
};

//POST LOGIN===============================================================
const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userData = await userSchema.findOne({ email: email });


    if (userData.email === email) {

      const passMatch = await bcrypt.compare(password, userData.password);

      if (passMatch) {

        if (userData.isBlocked === false) {

          if (userData.isVerified === false) {
            res.render("login", { message: ' User is not verifid ' })

          }

          if (userData.isAdmin === true) {
            res.render("login", { message: 'Admin is not alloweded' })
          }


          req.session.email = userData.email
          req.session.user = userData._id   


          res.redirect("/");
        } else {
          res.render("login", { message: "This user is blocked" });
         
        }

      } else {

        res.render("login", { message2: "password is incorrect" });
        

      }
    } else {
      res.render("login", { message: " email is incorrect" })
    }



  } catch (error) {
    throw new Error(error)
  }
};

// GET FORGET PASSWORD===================================================
const getForgetpass = async (req, res) => {
  try {

    res.render("forgetPass");

  } catch (error) {

    throw new Error(error)

  }
};

//POST FORGETPASSWORD======================================================
const postForgetpass = async (req, res) => {
  try {

    const email = req.body.email;
    req.session.email = email

    const userData = await userSchema.findOne({ email: email })

    if (userData) {
      const randomOtp = generateOtp();

     

      await sendOtpMail(userData.name, userData.email, randomOtp);
      const newOtp = new regOtp({
        email: userData.email,
        otp: randomOtp,

      });
      await newOtp.save()

      res.redirect(`/forgetPass/otp?email=${email}`)

      //res.json({ message: "OTP send to your email please check your mail" });

    } else {
      res.json({ message: "this email not exist" });
    }
  } catch (error) {
    throw new Error(error)
  }
};


//GET FORGET OTP=======================================================
const getForgetOtp = async (req, res) => {
  try {

    res.render("forgetPass-otp");

  } catch (error) {

    throw new Error(error)
  }
};

//POST FORGET OTP===================================================
const postForgetOtp = async (req, res) => {
  try {
    const email = req.query.email
    const { otp } = req.body;



    const userData = await userSchema.findOne({ email: email });

    if (!userData) {

      res.json({ message: "record doesn't exist" })
    } else {


      const otpData = await regOtp.findOne({ email: email });

     

      if (otpData) {


        if (otpData.otp === otp) {


          return res.redirect(`/change-pass?email=${email}`);

        } else {
         

          res.redirect(`/forgetPass/otp?email=${email}`);
        }
      } else {
        res.json({ message: "otp expired" })
      }
    }


  } catch (error) {
    throw new Error(error)
  }
};
//GET CHANGE PASSWORD====================================================


const getChangePass = async (req, res) => {
  try {


    res.render("changePass")
  } catch (error) {
    throw new Error(error)
  }
}
//CHANGE PASS POST   ============================================================

const postChangePass = async (req, res) => {
  try {

    const { password, confirmPassword } = req.body

    const email = req.query.email

    if (password === confirmPassword) {

      const hashPassword = await bcrypt.hash(password, 10);

      const hashConfirmPassword = await bcrypt.hash(confirmPassword, 10);


      const savePass = await userSchema.updateOne({ email: email }, { $set: { password: hashPassword } });
      res.redirect("/login");
      //res.flash({message:"password changed success fuly"})
    } else {
      // res.json({message:"password incorrect"})
      res.redirect(`/change-pass?id=${id}`)
    }
  } catch (error) {
    throw new Error(error)
  }
}

//LOGOUT  ============================================================
const userLogout = async (req, res) => {
  try {
    req.session.destroy(() => {

      res.redirect("/");
     
    })


  } catch (error) {
    throw new Error(error)
  }

}
//==================================================================
const googleAuth = async (req, res) => {

  try {
    
   
if(req.user){

  const checkUser = await userSchema.findOne({email:req.user.email})

  if(checkUser){
    req.session.user = checkUser._id;
    res.redirect('/'); 

  }else{
    
      res.render('/'); 

  }

}

  } catch (error) {
throw new Error(error.message)
  }

}

//=====================================================================
module.exports = {
  getSignup,
  getLogin,
  getForgetpass,
  postForgetpass,
  getChangePass,
  postChangePass,
  getOtpVerify,
  postOtpVerify,
  postSignup,
  postLogin,
  sendOtpMail,
  userLogout,
  getForgetOtp,
  postForgetOtp,
  resendOtp,
  googleAuth,

}
