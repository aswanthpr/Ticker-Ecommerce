

  const errorMiddleware =(error,req,res,next)=>{

    const status=error.status
    const message=error.message
    if(status==404){
        res.render('err404',{status:404, error:message})
    }else{
        res.render('err500',{status:500, error:message})
    }

} 

module.exports = errorMiddleware

module.exports={
  errorMiddleware,
    
} 


