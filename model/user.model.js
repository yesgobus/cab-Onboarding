import mongoose, {Schema, model} from "mongoose";


const userSchema = new Schema(
    {
    firstName: {
        type: String,
        required: true
    },
    lastName:{
        type:String
    },
    mobileNumber:{
        type:Number
    },
    email:{
        type:String
    },
    // password:{
    //     type:String
    // },
    socketId:{
        type:String
    },
    profile_img:{
        type:String,
        default : "https://cabdriver-bucket.s3.ap-south-1.amazonaws.com/cabdriver/29332cc5-6da5-4543-90dc-119c5e91d0f5.jpeg"
    },
    on_going_ride_id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'on_going_ride_model', // Dynamic reference path
      },
      on_going_ride_model: { // Field to store the model type
        type: String,
        enum: ['Ride', 'transportRide'] // Valid values for the model type
      },
    },

    {
        timestamps: true,
      }
)

export const UserModel = model("Users",userSchema);