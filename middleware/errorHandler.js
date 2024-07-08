
//========================================
// const createError = require('http-errors');

// const catch404 = async(req,res,next)=>{

//         next(createError(404))

// }

// const catch500  = async(err,req,res,next)=>{
    
//         res.locals.message = err.message
//         res.locals.error = req.app.get('env') ==="development"?err:[];
     
//         if (err.status === 404) {
//             console.log('this is error444')
//             res.status(404).render('err404');
           
//           } else {
//            
//             res.status(err.status || 500).render('err500');
//           }
// }

  const err500 = async(err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('err500');
  }

module.exports={
    // catch404,
    // catch500,
    err500,
}


