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
        type:String
    },
    on_going_ride_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride',
      },
    },

    {
        timestamps: true,
      }
)

export const UserModel = model("Users",userSchema);