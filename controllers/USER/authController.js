const userSchema = require("../../models/userModel");
const regOtp = require("../../models/userOtpverify");
const walletSchema = require("../../models/walletModel");
const { referralGenerator } = require("../../helper/refferelGen");
const { sendOtpMail } = require('../../helper/sendOtpMail')
const { generateOtp } = require('../../helper/otpGenerator')
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
    const existingReferral = await userSchema.findOne({ referral: referral });

    //checking user exist or not

    const existingUser = await userSchema.findOne({
      $or: [{ email }, { phone }],
    });

    console.log(existingUser, "exixsting user");
    if (existingUser) {
      return res.render("signup", {
        message: "user already exist with this email or phone number",
      });
    } else {
      if (password === confirmPassword) {
        //password hashing using bcrypt
        const hashPassword = await bcrypt.hash(password, 10);

        req.session.name = name;
        req.session.email = email;
        req.session.phone = phone;
        req.session.password = hashPassword;
        req.session.referredBy = existingReferral?.referral;

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

        return res.redirect(`/verify-otp?email=${email}`);
      } else {
        return res.json({ message3: "password incorrect" });
      }
    }
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
    const Name = req.session.name;
    const Email = req.session.email;
    const Phone = req.session.phone;
    const Password = req.session.password;
    const Referred = req.session.referredBy ? req.session.referredBy : null;
    console.log(Referred, "thsi is reffereaby");

    const otpData = await regOtp.findOne({ email: Email });
    console.log(otpData, "this is ot");

    if (otpData) {
      if (otpData?.otp === otp) {
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

        if (userDB && userData.referredBy == Referred) {
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


        req.session.user = userData._id;
        res.cookie("user", userData._id.toString(), {
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 1 day
        });
        req.session.email = Email;

        res.redirect("/");
      } else {
        res.redirect(`/verify-otp?email=${Email}`);
      }
    } else {
      res.json({ message: "otp expired" });
    }
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};

//RESEND OTP=================================================================

const resendOtp = async (req, res, next) => {
  try {
    const userData = await userSchema.findOne({
      email: req.session.email || req.query.email,
    });
    const Email =
      req.session.email !== undefined ? req.session.email : req.query.email;
    const otpData = await regOtp.findOne({ email: Email });

    if (!otpData) {
      const randomOtp = generateOtp();

      await sendOtpMail(
        " User",
        req.query.email || req.session.email,
        randomOtp
      );

      const existingOtp = await regOtp.findOne({ email: userData.email });
      if (existingOtp) {
        existingOtp.otp = randomOtp;
        await existingOtp.save();
      } else {
        const newOtp = new regOtp({
          email: userData.email,
          otp: randomOtp,
        });
        await newOtp.save();
      }

      res.json({ success: true, message: "OTP generated successfully" });
    } else {
      res.json({ success: false, message: "OTP exist try again" });
    }
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
    const email = req.body.email;
    req.session.email = email;

    const userData = await userSchema.findOne({ email: email });

    if (userData) {
      const randomOtp = generateOtp();

      await sendOtpMail(userData.name, userData.email, randomOtp);
      const existingOtp = await regOtp.findOne({ email: userData.email });
      if (existingOtp) {
        existingOtp.otp = randomOtp;
        await existingOtp.save();
      } else {
        const newOtp = new regOtp({
          email: userData.email,
          otp: randomOtp,
        });
        await newOtp.save();
      }
      res.redirect(`/forgetPass/otp?email=${email}`);

      //res.json({ message: "OTP send to your email please check your mail" });
    } else {
      res.json({ message: "this email not exist" });
    }
  } catch (error) {
    next(error);
    console.log(error.message);
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

    const userData = await userSchema.findOne({ email: email });

    if (!userData) {
      res.json({ message: "record doesn't exist" });
    } else {
      const otpData = await regOtp.findOne({ email: email });

      if (otpData) {
        if (otpData.otp === otp) {
          return res.redirect(`/change-pass?email=${email}`);
        } else {
          res.redirect(`/forgetPass/otp?email=${email}`);
        }
      } else {
        res.json({ message: "otp expired" });
      }
    }
  } catch (error) {
    next(error);
    console.log(error.message);
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

const postChangePass = async (req, res, next) => {
  try {
    const { password, confirmPassword } = req.body;

    const email = req.query.email;

    if (password === confirmPassword) {
      const hashPassword = await bcrypt.hash(password, 10);

      const hashConfirmPassword = await bcrypt.hash(confirmPassword, 10);

      const savePass = await userSchema.updateOne(
        { email: email },
        { $set: { password: hashPassword } }
      );
      res.redirect("/login");
      //res.flash({message:"password changed success fuly"})
    } else {
      // res.json({message:"password incorrect"})
      res.redirect(`/change-pass?id=${id}`);
    }
  } catch (error) {
    next(error);
    console.log(error.message);
  }
};

//LOGOUT  ============================================================
const userLogout = async (req, res, next) => {
  try {
    req.session.destroy()
     res.clearCookie('user');
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
