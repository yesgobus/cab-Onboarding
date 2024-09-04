import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    category_name:{
        type:String,
        required:true
    },
      image_url:{
        type:String
      },
      rate_per_km: {
        type: String,
        required: true,
      },
      ac:{
        type:Boolean
      },
      passenger_capacity:{
        type:String
      },
    
      luggage_capacity:{
        type:String
      },
      car_size:{
        type:String
      },
      rating:{
        type:String
      },
      total_ratings:{
        type:String
      },
      extra_km_fare:{
        type:String
      },
      fuel_type:{
        type:String
      },
      cancellation_policy:{
        type:String
      },
      free_waiting_time:{
        type:String
      },
    
      extracharge:{
        fare_beyond_included_distance:{
          type:String
        },
        waiting_charges_beyond_free_time:{
          type:String
        },
        night_time_allowance:{
          type:String
        }
      },
    
    inclusions:{
      pickup_drop:{
        type:String
      },
      state_taxes:{
        type:Boolean
      },
      toll_charges:{
        type:Boolean
      }
    },
    tagline:{
      type:String
    },
    verification:{
      type:String
    }
    

});

const Category = mongoose.model('categories', categorySchema);
export default Category; 