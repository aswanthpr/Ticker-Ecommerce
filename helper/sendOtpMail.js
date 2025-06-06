const nodemailer = require("nodemailer");
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
        throw new Error(error.message);
      } else {
        console.log("mail has been send:", info.response);
      }
    });
  } catch (error) {
    throw new Error(error.message);
  }
};
module.exports={sendOtpMail}