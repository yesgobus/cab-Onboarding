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
    // }
    },

    {
        timestamps: true,
      }
)

export const UserModel = model("Users",userSchema);