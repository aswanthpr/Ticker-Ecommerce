
const  dotEnv = require ("dotenv");
const  mongoose = require( "mongoose" );
dotEnv.config()

const dbConnect = async () => {
    try {
       
    const databaseUrl = process.env.MONGOURL;

    const connect = await mongoose.connect( databaseUrl ) ;

    console.log("database connected successfully");

    } catch (error) {

        console.log(`${error.message} db not connected`)

    }

    
};
module.exports={dbConnect}