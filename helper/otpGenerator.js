const otpGen = require("otp-generator");
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
    throw new Error(error.message);
  }
}
module.exports ={generateOtp}
