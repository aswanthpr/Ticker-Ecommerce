//IF ADMIN LOGIN=====================================
const ifAdmin= async (req, res, next) => {
    try {
        if (req.session.admin) {
           
        res.redirect("/admin/dashboard")
        } else {
           
            next()
        }

    } catch (error) {
        throw new Error(error)
    }
}
//IF ADMIN LOGOUT==================================
const ifNoAdmin = (req, res, next) => {
    try {
        if (req.session.admin==null || req.session.admin =="undifined") {
           
            res.redirect("/admin/login");
            
        } else {
           
           next()
        }
    } catch (error) {
        throw new Error(error)
    }
}

module.exports = {
    ifAdmin,
    ifNoAdmin
}