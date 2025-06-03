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
module.exports={
    referralGenerator
}