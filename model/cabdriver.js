import mongoose from 'mongoose';

const cabdriverSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
  },
  email: {
    type: String,
  },
  dob: {
    type: Date,
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
  },
  address: {
    type: String,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
    },
  },
  pincode: {
    type: String,
  },
  bank_account_detail: {
    account_type: {
      type: String,
      enum: ['Savings', 'Current'],
    },
    account_holder_name: {
      type: String,
    },
    account_number: {
      type: String,
    },
    ifsc_code: {
      type: String,
    },
  },
  aadhaar_number: {
    type: Number,
  },
  pane_card_number: {
    type: String,
  },
  driving_license: {
    type: String,
  },
  rc_number: {
    type: String,
  },
  total_experience: {
    type: String,
  },
  vehicle_type: {
    type: String,
  },
  vehicle_model: {
    type: String,
  },
  vehicle_category: {
    type: String,
  },
  vehicle_number: {
    type: String,
  },
  year_of_registration: {
    type: String,
  },
  dl_img: {
    type: String,
  },
  vehicle_reg_img: {
    type: String,
  },
  vehicle_image: {
    type: String,
  },
  profile_img: {
    type: String,
  },
  aadhaar_img: {
    type: String,
  },
  is_on_duty: {
    type: Boolean,
  },
  carDetails: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car'
  }],
  isAvailable: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
  },
  driver_rating: {
    type: String,
  },
  additional_information: [{
    type: String,
  }],
  verification_text: {
    type: String,
  },
  socketId: {
    type: String,
  },
  on_going_ride_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
  },
}, { timestamps: true });

export default mongoose.model('Driver', cabdriverSchema);
