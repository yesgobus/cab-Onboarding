import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    category_name:{
        type:String,
        required:true
    },
    carDetails: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car',  
        required: true,
      }],
      imageUrl:{
        type:String
      }
});

const Category = mongoose.model('categories', categorySchema);
export default Category; 