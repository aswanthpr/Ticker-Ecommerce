const passport = require("passport");
require('dotenv').config()
const userSchema = require("../models/userModel")
const otpGen = require("otp-generator");
const { referralGenerator } = require('../helper/refferelGen')


const googleStratagy = require("passport-google-oauth20").Strategy;

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser(async (id, done) => {

    await userSchema.findById(id).then((user) => {
        done(null, user);
    })


})

passport.use(
    new googleStratagy({
        clientID: process.env?.CLIENT_ID,
        clientSecret: process.env?.CLIENT_SECRET,
        callbackURL: process.env?.GOOGLE_CLIENT_URL,
        passReqToCallback: true,
    },
        async function (req, accessToken, refreshToken, profile, done) {


            //return (null,profile);
            const mail = profile.emails[0].value
            const googleId = profile._json.sub

            const userExist = await userSchema.findOne({ email: mail }).select("-password")
            if (userExist) {
                if (!userExist.googleId) {
                    return done(null, false, { message: "An account with this email already exist. Please log in using your email and password." })
                }
            }
            if (userExist && userExist.isVerified === true) {
                // req.session.user = userExist._id;

                done(null, userExist)

            } else {
                const referralCode = referralGenerator()

                const googleUser = new userSchema({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    isVerified: true,
                    referral: referralCode,
                    googleId: profile.id,
                })

                const savedUser = googleUser.save().then((newUser) => {

                    req.session.user = savedUser._id;
                     res.cookie("user", savedUser._id.toString(), {
                    httpOnly: true,
                    maxAge: 24 * 60 * 60 * 1000, 
                });
                    done(null, newUser)
                }).catch((error) => {
                    return done(error)
                })
            }
        }
    )
);

