const userSchema =require("../models/userModel")

const ifUser = async (req, res, next) => {
    try {

      if(req.session?.user){
   
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
        if(req.session.user==null || req.session?.user =="undifined"){

            res.redirect("/")
        }else{
        const user = await userSchema.findById(req.session.user);
    
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
