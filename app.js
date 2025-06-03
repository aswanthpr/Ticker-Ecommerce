
const express = require('express');
const path =require("path");
const session = require('express-session');
const cookieParser = require('cookie-parser')
const dotenv=require('dotenv'); dotenv.config();
const passport  = require("passport");
const compression = require('compression');

 const {errorMiddleware} = require("./middleware/errorHandler")

   

//database connection
const dataBase  = require("./config/database")
const mongoose = require("mongoose");
dataBase.dbConnect()

let  app = express();

const middleware = require("./middleware/middlewares")


//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('views', ['./views/user', './views/registration','./views/admin','./views/error']);
app.set('view engine', 'ejs')

app.use(middleware.sessionConfig);
app.use(middleware.cache);
app.use(middleware.morganConfig);
app.use(compression());


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(passport.initialize());
app.use(passport.session())
 app.use(cookieParser())

//getting routed from the routes folder

const userRouter = require("./routes/userRouter");
const adminRouter= require("./routes/adminRouter");
const { ejs } = require('ejs');
//usint routes
app.use("/", userRouter);
app.use("/",adminRouter);


// Use centralized error handling middleware

app.use(errorMiddleware);

app.all('*', function(req, res,next){
  res.status(404).render('err404')
});


 app.listen(process.env.PORT,()=>{
    console.log("server is running on http://localhost:3000") 
  }).on("error",(err)=>{
    console.log("Error in starting server"+ err)
  })


module.exports = app
  
  


