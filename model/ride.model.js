import mongoose from 'mongoose';

// Define the ride schema
const rideSchema = new mongoose.Schema({
  current_time: {
    type: String, 
    required: true
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
    required: true
  },
  pickup_duration: {
    type: String,
    required: true
  },
  status_accept:{
    type:Boolean
  }
});

// Create the Ride model
const Ride = mongoose.model('Ride', rideSchema);

export default Ride;
