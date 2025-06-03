const userSchema =require("../models/userModel")

const ifUser = async (req, res, next) => {
    try {

      if(req.cookies?.user){
   
        res.redirect("/")
  
        
    }else{
        next()
       
    }
    } catch (error) {
        console.log(error.message);
        next(error)
    }
}



const userCheck = async(req,res,next)=>{
    try {
        if(req.cookies.user==null || req.cookies?.user =="undifined"){

            res.redirect("/")
        }else{
        const user = await userSchema.findById(req.cookies.user);
    
        if(user?.isBlocked ===true){

            res.redirect('/logout')
            
        }else{
            next()
        }

        }
    } catch (error) {
        console.log(error.message);
        next(error)

    }
}
module.exports = {
    ifUser,
   userCheck,
}
