const orderSchema = require('../../models/orderModel');

//GET SALES REPOART PAGE
const getSalesPage = async (req, res) => {
    try {
const { selectValue, startDate,endDate} = req.query;
const filterType = ['all','daily','weekly','monthly','yearly']

        let totalPages
        let totalOrder
        let totalOfferAmt
        let totalAmount
        let salesData
        const  today = new Date();
        const page = parseInt(req.query.page) || 1;
        const limit = 60;
        const skip = (page - 1) * limit;


        //filteration
        // const periodFilter = req.query.filter ?req.query.filter.split(','):[];

        // const filter = {
        //     createdAt: {
        //         $gte: yesterday, $lte: today
        //     },
        //     "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] }
        // }

       

        if(selectValue =="all" || selectValue==undefined){
            salesData = await orderSchema.aggregate(
                [
                    {
                        $unwind: "$orderedItems"
                    },
    
                    {
                        $match: { "orderedItems.orderStatus": { $nin: ["Returned", "Cancelled"] } }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userId",
                            foreignField: "_id",
                            as: "userDetails"
                        }
                    },
    
                    {
                        $sort: { createdAt: -1 }
                    },
                    { $skip: skip },
                    { $limit: limit },
    
                ]
            )
            
    
             totalAmount = await orderSchema.aggregate([
                {
                    $unwind: "$orderedItems"
                },
    
                {
                    $match: { "orderedItems.orderStatus": { $nin: ["Returned", "Cancelled"] } }
                },
                {
                    "$group": {
                        "_id": null, "sumAmount": {
                            "$sum": {
                                "$multiply": ["$orderedItems.offerPrice", "$orderedItems.cartQuantity"]
                            }
                        }
                    }
                }
            ])
    
            
            //total offer
             totalOfferAmt = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { "orderedItems.orderStatus": { $in: ["Cancelled", "Returned"] } } },
                { $addFields: { "offerAmount": { $subtract: ["$orderedItems.mrp", "$orderedItems.offerPrice"] } } },
    
                { "$group": { "_id": null, "sumOffer": { "$sum": "$offerAmount" }, "couponSum": { "$sum": "$couponClaim" } } },
                { $addFields: { "totalDiscount": { $add: ["$sumOffer", "$couponSum"] } } }
    
    
    
            ])

             //total sales count 
        const totalOrderResult = await orderSchema.aggregate([
            { $unwind: "$orderedItems" },
            { $match: { "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
            { $group: { _id: null, count: { $sum: 1 } } }
        ]);
        totalOrder = totalOrderResult.length > 0 ? totalOrderResult[0].count : 0;
         totalPages = Math.ceil(totalOrder / limit);


        }else if(selectValue =="daily" ){
            //ivide ippozhathe time nu same innalathe time sert cheithu
            const yesterday = new Date(today);
         
            //The getDate() method returns the day of the month (from 1 to 31) for the specified date according to local time.
            //The setDate() method sets the day of the month for a specified date according to local time.
            yesterday.setDate(today.getDate() - 1);
           

           // daily sales report
            // salesData = await orderSchema.aggregate([
            //     { $unwind: "$orderedItems" },
            //     { $match: { createdAt: { $gte: yesterday, $lt: today }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
            //     {
            //         $sort: { createdAt: -1 }
            //     },

            // ])




            salesData = await orderSchema.aggregate(
                [
                    {
                        $unwind: "$orderedItems"
                    },
    
                    {
                        $match: { createdAt: { $gte: yesterday, $lt: today },"orderedItems.orderStatus": { $nin: ["Returned", "Cancelled"] } }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userId",
                            foreignField: "_id",
                            as: "userDetails"
                        }
                    },
    
                    {
                        $sort: { createdAt: -1 }
                    },
                    
    
                ]
            )

           

            //total amount
             totalAmount = await orderSchema.aggregate([
                {
                    $unwind: "$orderedItems"
                },

                {
                    $match: { createdAt: { $gte: yesterday, $lt: today }, "orderedItems.orderStatus": { $nin: ["Returned", "Cancelled"] } }
                },
                {
                    "$group": {
                        "_id": null, "sumAmount": {
                            "$sum": {
                                "$multiply": ["$orderedItems.offerPrice", "$orderedItems.cartQuantity"]
                            }
                        }
                    }
                }
            ])
           
            //totaloffer amout
            totalOfferAmt = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { createdAt: { $gte: yesterday, $lt: today }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
                { $addFields: { "offerAmount": { $subtract: ["$orderedItems.mrp", "$orderedItems.offerPrice"] } } },

                { "$group": { "_id": null, "sumOffer": { "$sum": "$offerAmount" }, "couponSum": { "$sum": "$couponClaim" } } },
                { $addFields: { "totalDiscount": { $add: ["$sumOffer", "$couponSum"] } } }


            ])
           
             //sales count
           const totalOrderResult = await orderSchema.aggregate([
            { $unwind: "$orderedItems" },
            { $match: { createdAt: { $gte: yesterday, $lt: today }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
            { $group: { _id: null, count: { $sum: 1 } } }
        ]);
        totalOrder = totalOrderResult.length > 0 ? totalOrderResult[0].count : 0;
        totalPages = Math.ceil(totalOrder / limit);
       

        }else if(selectValue =="weekly"){
            
            // const lastWeekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
            // const lastWeekEnd = today;
          
            const lastWeekEnd = new Date(today); 
            const lastWeekStart = new Date(today); 
            lastWeekStart.setDate(today.getDate() - 7);
        
      

            salesData = await orderSchema.aggregate(
                [
                    {
                        $unwind: "$orderedItems"
                    },
    
                    {
                        $match: { createdAt: { $gte: lastWeekStart, $lt: lastWeekEnd },"orderedItems.orderStatus": { $nin: ["Returned", "Cancelled"] } }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userId",
                            foreignField: "_id",
                            as: "userDetails"
                        }
                    },
    
                    {
                        $sort: { createdAt: -1 }
                    },
                    
    
                ]
            )
            //sales count
            const totalOrderResult = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
                { $group: { _id: null, count: { $sum: 1 } } }
            ]);
            totalOrder = totalOrderResult.length > 0 ? totalOrderResult[0].count : 0;
             totalPages = Math.ceil(totalOrder / limit);

            //total amount
             totalAmount = await orderSchema.aggregate([
                {
                    $unwind: "$orderedItems"
                },

                {
                    $match: { createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd }, "orderedItems.orderStatus": { $nin: ["Returned", "Cancelled"] } }
                },
                {
                    "$group": {
                        "_id": null, "sumAmount": {
                            "$sum": {
                                "$multiply": ["$orderedItems.offerPrice", "$orderedItems.cartQuantity"]
                            }
                        }
                    }
                }
            ])

            //totaloffer amout
             totalOfferAmt = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
                { $addFields: { "offerAmount": { $subtract: ["$orderedItems.mrp", "$orderedItems.offerPrice"] } } },

                { "$group": { "_id": null, "sumOffer": { "$sum": "$offerAmount" }, "couponSum": { "$sum": "$couponClaim" } } },
                { $addFields: { "totalDiscount": { $add: ["$sumOffer", "$couponSum"] } } }


            ])


          
        } else if (selectValue == "monthly") {
            // const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            // const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
             

            const lastDayOfMonth = new Date();
            const firstDayOfMonth = new Date(lastDayOfMonth);
            firstDayOfMonth.setDate(today.getDate() - 30);
           
            salesData = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
                {
                    $sort: { createdAt: -1 }
                },

            ])
            //sales count
            const totalOrderResult = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
                { $group: { _id: null, count: { $sum: 1 } } }
            ]);
            totalOrder = totalOrderResult.length > 0 ? totalOrderResult[0].count : 0;
             totalPages = Math.ceil(totalOrder / limit);

            //total amount
             totalAmount = await orderSchema.aggregate([
                {
                    $unwind: "$orderedItems"
                },

                {
                    $match: { createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }, "orderedItems.orderStatus": { $nin: ["Returned", "Cancelled"] } }
                },
                {
                    "$group": {
                        "_id": null, "sumAmount": {
                            "$sum": {
                                "$multiply": ["$orderedItems.offerPrice", "$orderedItems.cartQuantity"]
                            }
                        }
                    }
                }
            ])

            //totaloffer amout
             totalOfferAmt = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
                { $addFields: { "offerAmount": { $subtract: ["$orderedItems.mrp", "$orderedItems.offerPrice"] } } },

                { "$group": { "_id": null, "sumOffer": { "$sum": "$offerAmount" }, "couponSum": { "$sum": "$couponClaim" } } },
                { $addFields: { "totalDiscount": { $add: ["$sumOffer", "$couponSum"] } } }


            ])
        } else if (selectValue == "yearly") {
            const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
            const lastDayOfYear = new Date(today.getFullYear(), 11, 31);
             salesData = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { createdAt: { $gte: firstDayOfYear, $lte: lastDayOfYear }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
                {
                    $sort: { createdAt: -1 }
                },

            ])
            //sales count
            const  totalOrderResult = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { createdAt: { $gte: firstDayOfYear, $lte: lastDayOfYear }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
                { $group: { _id: null, count: { $sum: 1 } } }
            ]);
            totalOrder = totalOrderResult.length > 0 ? totalOrderResult[0].count : 0;
            totalPages = Math.ceil(totalOrder / limit);

            //total amount
             totalAmount = await orderSchema.aggregate([
                {
                    $unwind: "$orderedItems"
                },

                {
                    $match: { createdAt: { $gte: firstDayOfYear, $lte: lastDayOfYear }, "orderedItems.orderStatus": { $nin: ["Returned", "Cancelled"] } }
                },
                {
                    "$group": {
                        "_id": null, "sumAmount": {
                            "$sum": {
                                "$multiply": ["$orderedItems.offerPrice", "$orderedItems.cartQuantity"]
                            }
                        }
                    }
                }
            ])

            //totaloffer amout
             totalOfferAmt = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { createdAt: { $gte: firstDayOfYear, $lte: lastDayOfYear }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
                { $addFields: { "offerAmount": { $subtract: ["$orderedItems.mrp", "$orderedItems.offerPrice"] } } },

                { "$group": { "_id": null, "sumOffer": { "$sum": "$offerAmount" }, "couponSum": { "$sum": "$couponClaim" } } },
                { $addFields: { "totalDiscount": { $add: ["$sumOffer", "$couponSum"] } } }


            ])


           
        } else if (selectValue =="custom") {
            const start = new Date(startDate);
            const end = new Date(endDate)
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
             salesData = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { createdAt: { $gte: start, $lte: end }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
                {
                    $sort: { createdAt: -1 }
                },

            ])

            //sales count
            const  totalOrderResult = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { createdAt: { $gte: start, $lte: end }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
                { $group: { _id: null, count: { $sum: 1 } } }
            ]);
            totalOrder = totalOrderResult.length > 0 ? totalOrderResult[0].count : 0;
             totalPages = Math.ceil(totalOrder / limit);

            //total amount
             totalAmount = await orderSchema.aggregate([
                {
                    $unwind: "$orderedItems"
                },

                {
                    $match: { createdAt: { $gte: start, $lte: end}, "orderedItems.orderStatus": { $nin: ["Returned", "Cancelled"] } }
                },
                {
                    "$group": {
                        "_id": null, "sumAmount": {
                            "$sum": {
                                "$multiply": ["$orderedItems.offerPrice", "$orderedItems.cartQuantity"]
                            }
                        }
                    }
                }
            ])

            //totaloffer amout
             totalOfferAmt = await orderSchema.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { createdAt: { $gte: start, $lte: end }, "orderedItems.orderStatus": { $nin: ['Cancelled', 'Returned'] } } },
                { $addFields: { "offerAmount": { $subtract: ["$orderedItems.mrp", "$orderedItems.offerPrice"] } } },

                { "$group": { "_id": null, "sumOffer": { "$sum": "$offerAmount" }, "couponSum": { "$sum": "$couponClaim" } } },
                { $addFields: { "totalDiscount": { $add: ["$sumOffer", "$couponSum"] } } }


            ])

        
        }

       
        res.render('salesRepoart', { salesData, totalPages, currentPage: page, limit, totalOrder, totalAmount, totalOfferAmt ,filterType,selectValue});
    } catch (error) {
        throw new Error(error.message);
    }
}
//FULL SALES DATA 
const fullSales = async (req, res) => {
    try {
        const salesData = await orderSchema.aggregate([
            { $unwind: "$orderedItems" },
            { $match: { "orderedItems.orderStatus": { $nin: ["Returned", "Cancelled"] } } },
            { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "userDetails" } },
            { $sort: { createdAt: -1 } }
        ]);
        return res.json({ salesData })
    } catch (error) {
        throw new Error(error)
    }
}


//EXPORTS
module.exports = {
    getSalesPage,
    
  
}