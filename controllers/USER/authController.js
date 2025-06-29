const userSchema = require("../../models/userModel");
const regOtp = require("../../models/userOtpverify");
const walletSchema = require("../../models/walletModel");
const { referralGenerator } = require("../../helper/refferelGen");
const { sendOtpMail } = require("../../helper/sendOtpMail");
const { generateOtp } = require("../../helper/otpGenerator");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

//GET SIGNUP=============================================================

const getSignup = async (req, res, next) => {
  try {
    const referral = req.query?.referral;

    res.render("signup", { referral });
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};

//POST SIGNUP==========================================================

const postSignup = async (req, res, next) => {
  try {
    const { name, phone, email, password, referral, confirmPassword } =
      req.body;

    //checking is it existing referral
    let existingReferral = null;
    if (referral) {
      console.log(referral,'refferel')
     existingReferral = await userSchema.findOne({ referral });
      if (!existingReferral) {
        return res
          .status(400)
          .json({ message: "Referral code does not exist" });
      }
    }
    //checking user exist or not

    const existingUser = await userSchema.findOne({
      $or: [{ email }, { phone }],
    });

    console.log(existingUser, "exixsting user");
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email or phone number",
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    //password hashing using bcrypt
    const hashPassword = await bcrypt.hash(password, 10);

    req.session.name = name;
    req.session.email = email;
    req.session.phone = phone;
    req.session.password = hashPassword;
    req.session.referredBy = existingReferral?.referral ?? null;

    const randomOtp = generateOtp();

    await sendOtpMail(name, email, randomOtp);

    const existingOtp = await regOtp.findOne({ email: email });
    if (existingOtp) {
      existingOtp.otp = randomOtp;
      await existingOtp.save();
    } else {
      const newOtp = new regOtp({
        email: email,
        otp: randomOtp,
      });
      await newOtp.save();
    }
 return res.status(200).json({
      success: true,
      message: "Signup successful, OTP sent",
      redirectUrl: `/verify-otp?email=${email}`,
    });
    // return res.redirect(`/verify-otp?email=${email}`);
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};

//GET VERIFY OTP=========================================================
const getOtpVerify = async (req, res, next) => {
  try {
    res.render("verifyOtp");
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};

//POST VERIFY OTP===================================================
const postOtpVerify = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const Name = req.session?.name;
    const Email = req.session?.email;
    const Phone = req.session?.phone;
    const Password = req.session?.password;
    const Referred = req.session?.referredBy ? req.session?.referredBy : null;
  

    const otpData = await regOtp.findOne({ email: Email });
    console.log(otpData, "this is otp");

    if (!otpData?.otp) {
  return res.status(400).json({ success: false, message: "OTP expired" });
}
if (otpData?.otp !== otp) {
  return res.status(400).json({ success: false, message: "Incorrect OTP" });
}
    const checkUserExist =await userSchema.findOne({
      $or: [{ Email }, { Phone }],
    });
    if (checkUserExist?.email || checkUserExist?.phone) {
      return res.status(400).json({ message: "User already Exist" });
    }
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
    const userDB = await userSchema.findOne({ referral: Referred });

    if (userDB && userData?.referredBy == Referred) {
      await walletSchema.findOneAndUpdate(
        { userId: userDB._id },
        {
          $inc: { balance: 100 },
          $push: {
            history: {
              createTime: new Date(),
              amount: 100,
              transactionType: "Credit",
              discription: `${Name}'s Refrral Bonus`,
            },
          },
        },
        { upsert: true }
      );

      await walletSchema.findOneAndUpdate(
        { userId: userData._id },
        {
          $inc: { balance: 50 },
          $push: {
            history: {
              createTime: new Date(),
              amount: 50,
              transactionType: "Credit",
              discription: "Referree Bonus",
            },
          },
        },
        { upsert: true }
      );
    }

    req.session.user = userData?._id;
    res.cookie("user", userData?._id.toString(), {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    req.session.email = Email;

    return res.status(200).json({ success: true, redirect: '/' });

  } catch (error) {
    next(error);
    console.log(error.message);
  }
};

//RESEND OTP=================================================================

const resendOtp = async (req, res, next) => {
  try {
    const email = req.query?.email ?? req.session?.email;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    const existingOtpRecord = await regOtp.findOne({ email });
    if (existingOtpRecord && existingOtpRecord.otp) {
      return res.json({
        success: false,
        message: "An OTP already exists. Please wait before retrying.",
      });
    }
    const randomOtp = generateOtp();
    await sendOtpMail(" User", email, randomOtp);

    if (existingOtpRecord) {
      existingOtpRecord.otp = randomOtp;
      await existingOtpRecord.save();
    } else {
      await new regOtp({ email, otp: randomOtp }).save();
    }

    res.json({ success: true, message: "OTP generated successfully" });
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};

//GET LOIGN===============================================================
const getLogin = async (req, res, next) => {
  try {
    res.render("login");
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};

//POST LOGIN===============================================================
const postLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const userData = await userSchema.findOne({ email: email });

    console.log("userData:", userData);

    if (userData?.email === email) {
      if (userData.password) {
        const passMatch = await bcrypt.compare(password, userData.password);

        if (passMatch) {
          if (userData?.isBlocked === false) {
            if (userData?.isVerified === false) {
              return res.render("login", { message: "User is not verified" });
            }

            if (userData.isAdmin === true) {
              return res.render("login", { message: "Admin is not allowed" });
            }

            req.session.email = userData.email;
            req.session.user = userData._id;
            res.cookie("user", userData?._id.toString(), {
              httpOnly: true,
              maxAge: 24 * 60 * 60 * 1000, // 1 day
            });

            return res.redirect("/");
          } else {
            return res.render("login", { message: "This user is blocked" });
          }
        } else {
          return res.render("login", { message2: "Password is incorrect" });
        }
      } else {
        console.error("Error: userData.password is undefined");
        return res.render("login", { message2: "Password is incorrect" });
      }
    } else {
      return res.render("login", { message: "Email is incorrect" });
    }
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};

// GET FORGET PASSWORD===================================================
const getForgetpass = async (req, res, next) => {
  try {
    res.render("forgetPass");
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};

//POST FORGETPASSWORD======================================================
const postForgetpass = async (req, res, next) => {
  try {
    const email = req.body.email?.trim();
console.log(email,'email aanu')
    // ✅ Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    const userData = await userSchema.findOne({ email });

    if (!userData) {
      return res.status(404).json({ success: false, message: 'This email does not exist' });
    }

    req.session.email = email;

    const randomOtp = generateOtp();
    await sendOtpMail(userData.name, userData.email, randomOtp);

    const existingOtp = await regOtp.findOne({ email });

    if (existingOtp) {
      existingOtp.otp = randomOtp;
      await existingOtp.save();
    } else {
      const newOtp = new regOtp({ email, otp: randomOtp });
      await newOtp.save();
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please check your inbox.',
      redirectTo: `/forgetPass/otp?email=${encodeURIComponent(email)}`
    });

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' });
  }
};


//GET FORGET OTP=======================================================
const getForgetOtp = async (req, res, next) => {
  try {
    res.render("forgetPass-otp");
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};

//POST FORGET OTP===================================================

const postForgetOtp = async (req, res, next) => {
  try {
    const email = req.query.email;
    const { otp } = req.body;
console.log(email,otp)
    const userData = await userSchema.findOne({ email });
    console.log(userData)

    if (!userData) {
      return res.status(404).json({ success: false, message: "User record doesn't exist" });
    }

    const otpData = await regOtp.findOne({ email });

    if (!otpData) {
      return res.status(410).json({ success: false, message: "OTP expired or not found" });
    }

    if (otpData.otp !== otp) {
      return res.status(401).json({ success: false, message: "Incorrect OTP" });
    }

    // OTP is correct
    return res.status(200).json({ success: true, message: "OTP verified", redirectUrl: `/change-pass?email=${email}` });

  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
//GET CHANGE PASSWORD====================================================

const getChangePass = async (req, res, next) => {
  try {
    res.render("changePass");
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};
//CHANGE PASS POST   ============================================================

// const postChangePass = async (req, res, next) => {
//   try {
//     const { password, confirmPassword } = req.body;

//     const email = req.query.email;

//     if (password === confirmPassword) {
//       const hashPassword = await bcrypt.hash(password, 10);

//       const hashConfirmPassword = await bcrypt.hash(confirmPassword, 10);

//       const savePass = await userSchema.updateOne(
//         { email: email },
//         { $set: { password: hashPassword } }
//       );
//       res.redirect("/login");
//       //res.flash({message:"password changed success fuly"})
//     } else {
//       // res.json({message:"password incorrect"})
//       res.redirect(`/change-pass?id=${id}`);
//     }
//   } catch (error) {
//     next(error);
//     console.log(error.message);
//   }
// };
const postChangePass = async (req, res, next) => {
  try {
    const { password, confirmPassword } = req.body;
    const email = req.query.email;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const user = await userSchema.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: 'Password changed successfully.',redirect:"/login" });
  } catch (error) {
    console.error('Error in password change:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
//LOGOUT  ============================================================
const userLogout = async (req, res, next) => {
  try {
    req.session.destroy();
    res.clearCookie("user");
    res.redirect("/");
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};
//==================================================================
const googleAuth = async (req, res, next) => {
  try {
    if (req.user) {
      const checkUser = await userSchema.findOne({ email: req.user.email });

      if (checkUser) {
        req.session.user = checkUser._id;
        res.cookie("user", checkUser._id.toString(), {
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 1 day
        });
        res.redirect("/");
      } else {
        res.render("/");
      }
    }
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};

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
};
