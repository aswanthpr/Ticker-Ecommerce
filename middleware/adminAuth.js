//IF ADMIN LOGIN=====================================
const ifAdmin= async (req, res, next) => {
    try {
        const adminCookie = req.cookies.admin;
        if (adminCookie) {
           
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
        const adminCookie = req.cookies.admin;

        if (adminCookie==null || adminCookie =="undifined") {
           
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