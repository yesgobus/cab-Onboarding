import mongoose from "mongoose";

const transportRideSchema = new mongoose.Schema({
    current_time: {
        type: String, 
        required: true
      },
      booking_date :{
        type:String
      },
      user_name: {
        type: String,
        required: true
      },
      trip_distance: {
        type: String,
        required: true
      },
      trip_duration: {
        type: String,
        required: true
      },
      trip_amount: {
        type: String,
        required: true
      },
    pickup_address: {
        type: String,
        required: true
      },
      pickup_lat: {
        type: String, 
        required: true
      },
      pickup_lng: {
        type: String, 
        required: true
      },
      drop_address: {
        type: String,
        required: true
      },
      drop_lat: {
        type: String, 
        required: true
      },
      drop_lng: {
        type: String, 
        required: true
      },
      pickup_distance: {
        type: String,
      },
      pickup_duration: {
        type: String,
      },
      userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
      },
      driverId:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
      },
      reciever_name:{
        type:String,
        required: true
      },
      reciever_number:{
        type:String,
        required: true
      },
      transport_type:{
        type:String,
        enum:['local','outstation'],
        required: true
      },
      status_accept:{
        type:Boolean,
        default: false
      },
      isSearching :{
        type:Boolean,
        default: true
      },
      otp:{
        type:String
      },
      user_phone:{
        type: String
      },
      driver_phone:{
        type:String
      },  
      can_be_cancelled: {
        type:Boolean,
        default: true
      },
      isStarted:{
        type:Boolean, 
        default: false
      },
      startTime:{
        type:String
      },
      completedTime:{
        type:String
      },
      trip_time:{
        type:String
      },
      status:{
        type:String
      },
      goods_type:[{
        type:String
      }],
      is_transport_ride:{
        type:Boolean,
        default:true
      }

});

const transportRide = mongoose.model('transportRide', transportRideSchema);

export default transportRide;