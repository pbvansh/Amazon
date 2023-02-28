// db.products.aggregate([
//     {
//         $lookup: {
//             from: "users",
//             localField: "companyId",
//             foreignField: "_id",
//             as: "seller"
//         }
//     }, {
//         $unwind: "$seller"
//     }, {
//         $project: {
//             "seller.password": 0,
//             "seller.companyId": 0,
//             "seller.passwordModifyAt": 0,
//             "seller.createdAt": 0,
//             "seller.isDeleted": 0,
//             "seller.isSeller": 0,
//         }
//     },
//     {
//         $lookup: {
//             from: "stocks",
//             localField: "_id",
//             foreignField: "productId",
//             as: "stocks"
//         }
//     }, {
//         $lookup: {
//             from: "reviews",
//             localField: "_id",
//             foreignField: "productId",
//             as: "reviews"
//         }
//     },
//     {
//         $unwind: {
//             path: "$reviews",
//             preserveNullAndEmptyArrays: true
//         }
//     },
//     {
//         $lookup: {
//             from: "users",
//             localField: "reviews.userId",
//             foreignField: "_id",
//             as: "reviews.user"
//         }
//     },
//     {
//         $unwind: {
//             path: "$reviews.user",
//             preserveNullAndEmptyArrays: true
//         }
//     }, {
//         $project: {
//             "reviews.user.password": 0,
//             "reviews.user.passwordModifyAt": 0,
//             "reviews.user.isDeleted": 0,
//             "reviews.productId": 0,
//             "reviews._id": 0,
//         }
//     }
// ])

db.products.aggregate([
    {
        $lookup: {
            from: "users",
            localField: "companyId",
            foreignField: "_id",
            as: "seller"
        }
    }, {
        $unwind: "$seller"
    },
    {
        $lookup: {
            from: "stocks",
            localField: "_id",
            foreignField: "productId",
            as: "stocks"
        }
    }, {
        $lookup: {
            from: "reviews",
            localField: "_id",
            foreignField: "productId",
            as: "reviews"
        }
    },
    {
        $lookup: {
            from: "users",
            let: { array: "$reviews" },
            pipeline: [
                { $match: { $expr: { $in: ['$_id', '$$array.userId'] } } },
            ],
            as: "users"
        }
    }
])

