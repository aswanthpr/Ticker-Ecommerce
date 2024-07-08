const session = require('express-session');
const morgan = require('morgan');
const logger = require('morgan');




//cache controll

const cache = async(req,res,next)=>{
   
        res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
        res.header("Expires", "-1");
        res.header("ticker", "no-cache");
        next();
     
};
module.exports = {
    cache,
}
//session middleware
module.exports.sessionConfig =session({
    secret:process.env.RANDOMSTUFF,
    resave:false,
    saveUninitialized:false,
    cookie:{
      httpOnly:true,
      secure:false,
      maxAge:24*60*60*1000,
    }
  })


//morgan middleware||logger middleware

module.exports.morganConfig =logger('dev');

//helmet for  helps secure your Express app by setting various HTTP headers. 
//It includes protections against some well-known web vulnerabilities by default.

//Compression Middleware: compression middleware is used to compress response bodies for all requests, which helps to reduce the size of the data transferred to the client, improving load times.
