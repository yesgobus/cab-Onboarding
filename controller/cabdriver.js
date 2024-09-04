import axios from 'axios';
import cabdriverModel from '../model/cabdriver.js';
import jwt from 'jsonwebtoken';
import * as aws from '../aws/aws.js';
import Ride from '../model/ride.model.js';
import { UserModel } from '../model/user.model.js';
import cron from 'node-cron';
import moment from 'moment-timezone';
import Car from '../model/car.model.js';

function normalizeName(name) {
  console.log(name.toLowerCase().replace(/[^a-z\s]/g, '').trim())
  return name?.toLowerCase().replace(/[^a-z\s]/g, '').trim();
}

function matchNames(name1, name2) {
console.log(normalizeName(name1))
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);
  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  // Implement distance calculation (Haversine formula or similar)
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

function convertCurrencyStringToNumber(currencyString) {
  // Remove the currency symbol and any commas or spaces
  const numericString = currencyString.replace(/[^0-9.-]/g, '');
  // Convert to number
  return parseFloat(numericString);
}

function formatTripTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let formattedDuration = '';

  if (hours > 0) {
    formattedDuration += `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (minutes > 0) {
    if (formattedDuration) {
      formattedDuration += ' ';
    }
    formattedDuration += `${minutes} min${minutes > 1 ? 's' : ''}`;
  }
  if (seconds > 0 || formattedDuration === '') {
    if (formattedDuration) {
      formattedDuration += ' ';
    }
    formattedDuration += `${seconds} sec${seconds > 1 ? 's' : ''}`;
  }

  return formattedDuration;
}

function formatDate(inputDateStr) {
  // Convert the string to a Date object
  const dateObj = new Date(inputDateStr);
  
  // Extract date components
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const day = dateObj.getDate().toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours24 = dateObj.getHours();
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  
  // Convert to 12-hour format
  const isPM = hours24 >= 12;
  const hours12 = hours24 % 12 || 12;
  const period = isPM ? 'PM' : 'AM';
  
  // Format the final output
  return `${weekday} ${month} ${day} ${year} ${hours12}:${minutes} ${period}`;
}


const cabdriverController = {
  user_signup : async (req, res) => {
  try {
    const { firstName, email, lastName, mobileNumber } = await req.body;
    const reqUser = await cabdriverModel.findOne({
      mobileNumber: mobileNumber,
    });
    if (
      email !== "" &&
      !/\w+([\.-]?\w)*@\w+([\.-]?\w)*(\.\w{2,3})+$/.test(email.trim())
    ) {
      console.log(/\w+([\.-]?\w)*@\w+([\.-]?\w)*(\.\w{2,3})+$/.test(email));
      return res
        .status(200)
        .send({ status: false, data: {}, message: "Invalid email id" });
    }
    if (reqUser) {
      return res
        .status(200)
        .send({ status: false, data: {}, message: "User already exists" });
    }
    const user = await cabdriverModel.create({
      firstName,
      lastName,
      email,
      mobileNumber,
    });
    const response = await axios.post(
      "https://auth.otpless.app/auth/otp/v1/send",
      {
        phoneNumber: mobileNumber,
        otpLength: 6,
        channel: "SMS",
        expiry: 600,
      },
      {
        headers: {
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response);
    return res.status(200).send({
      status: true,
      data: response.data,
      message: "Signup Successfully",
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "server error",
    });
  }
},
  resend_otp : async (req, res) => {
  try {
    const response = await axios.post(
      "https://auth.otpless.app/auth/otp/v1/resend",
      {
        orderId: req.body.orderId,
      },
      {
        headers: {
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response);
    return res.status(200).send({
      status: true,
      data: response.data,
      message: "OTP send Successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "server error",
    });
  }
},
  verify_otp : async (req, res) => {
  try {
    const response = await axios.post(
      "https://auth.otpless.app/auth/otp/v1/verify",
      {
        orderId: req.body.orderId,
        otp: req.body.otp,
        phoneNumber: req.body.mobileNumber,
      },
      {
        headers: {
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.isOTPVerified) {
      const user = await cabdriverModel.findOne({
        mobileNumber: req.body.mobileNumber,
      });
      if (user) {
        const payload = {
          userId: user._id,
          mobileNumber: req.body.mobileNumber,
        };

        const generatedToken = jwt.sign(payload, process.env.JWT_KEY);
        return res.status(200).send({
          status: true,
          data: { token: generatedToken, user: user },
          message: "OTP verified",
        });
      }
    }
    return res.status(200).send({
      status: false,
      data: response.data,
      message: response.data.reason,
    });
  } catch (err) {
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "server error",
    });
  }
},
  user_login : async (req, res) => {
  try {
    const user = await cabdriverModel.findOne({
      mobileNumber: req.body.mobileNumber,
    });

    if (!user) {
      return res
        .status(200)
        .send({ status: false, data: {}, message: "user dose not exist" });
    }
    const response = await axios.post(
      "https://auth.otpless.app/auth/otp/v1/send",
      {
        phoneNumber: req.body.mobileNumber,
        otpLength: 6,
        channel: "SMS",
        expiry: 600,
      },
      {
        headers: {
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          "Content-Type": "application/json",
        },
      }
    );
    return res.status(200).send({
      status: true,
      data: response.data,
      message: "Signup Successfully",
    });
  } catch (err) {
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "server error",
    });
  }
},

  send_otp_to_aadhaar : async (req, res) => {
  try {
    const { aadhaar_number } = req.body;
    if (aadhaar_number.length !== 12) {
      return res
        .status(200)
        .status({ status: false, data: {}, message: "Invalid aadhaar number" });
    }
    const response = await axios.post(
      "https://api.idcentral.io/idc/v2/aadhaar/okyc/generate-otp",
      { aadhaar_number: Number(aadhaar_number) },
      {
        headers: {
          accept: "application/json",
          "api-key": process.env.AADHAAR_API_KEY, // Replace 'YOUR_API_KEY' with your actual API key
        },
      }
    );
    const data = response.data;
    res.status(200).send({
      status: response.data?.data?.valid_aadhaar ? true : false,
      data,
      message: response?.data?.data?.valid_aadhaar
        ? "OTP send successfully"
        : "Invalid aadhaar number",
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "server error",
    });
  }
},

  verify_aadhaar : async (req, res) => {
  try {
    const { otp } = req.body;
    const { client_id } = req.body;
    const response = await axios.post(
      "https://api.idcentral.io/idc/v2/aadhaar/okyc/submit-otp",
      { otp: Number(otp), client_id }, // Include client_id in the request body
      {
        headers: {
          accept: "application/json",
          "api-key": process.env.AADHAAR_API_KEY, // Replace 'YOUR_API_KEY' with your actual API key
          "Content-Type": "application/json",
        },
      }
    );
    if (response?.data?.data !== null && response?.data?.status === "success") {
      await cabdriverModel.findOneAndUpdate(
        { _id: req.user },
        { aadhaar_number: Number(req.body.aadhaar_number) }
      );
      res
        .status(200)
        .json({ status: true, data: {}, message: "Verification successful" });
    } else {
      res
        .status(400)
        .json({ status: false, data: {}, message: response.data.message });
    }
  } catch (err) {
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "Invalid OTP",
    });
  }
},

  validate_pan : async (req, res) => {
  try {
    if (!/[A-Z]{5}[0-9]{4}[A-Z]{1}/.test(req.body.pan_number)) {
      return res
        .status(200)
        .send({ status: false, data: {}, message: "Invalid PAN Number" });
    }
    const { pan_number, dob, full_name } = req.body;
    const response = await axios.post(
      "https://api.idcentral.io/idc/v2/pan/pan-verify",
      {
        id_number: pan_number,
        dob,
        full_name,
      },
      {
        headers: {
          accept: "application/json",
          "api-key": process.env.AADHAAR_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response);
    if (response.data.error === null) {
      await cabdriverModel.findOneAndUpdate(
        { _id: req.user },
        { pane_card_number: req.body.pan_number }
      );
      return res.status(200).send({
        status: true,
        data: response.data,
        message:
          response.data.error !== null
            ? response.data.error
            : "Pan Card validation successful",
      });
    } else {
      return res
        .status(200)
        .send({ status: false, data: {}, message: "Invalid PAN Detail" });
    }
  } catch (err) {
    console.log(err.message);
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "server error",
    });
  }
},

  validate_driving_license : async (req, res) => {
  try {
    const { license_number, dob } = req.body;
    const response = await axios.post(
      "https://api.idcentral.io/idc/driving-license",
      {
        id_number: license_number,
        dob,
      },
      {
        headers: {
          accept: "application/json",
          "api-key": process.env.AADHAAR_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.response_code === 1) {
      const data = await cabdriverModel.findOneAndUpdate(
        { _id: req.user },
        { driving_license: req.body.license_Number }
      );
      return res.status(200).send({
        status: response.data.response_code === 1 ? true : false,
        data: response.data,
        message: response.data.message,
      });
    } else {
      return res
        .status(200)
        .send({ status: false, data: {}, message: response.data.message });
    }
  } catch (err) {
    console.log(err.message);
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "server error",
    });
  }
},
  validate_rc : async (req,res)=>{
  try{
    const response = await axios.post(
      "https://api.idcentral.io/idc/v2/rc/verify",
      {
        rc_number: req.body.rc_number
      },
      {
        headers: {
          accept: "application/json",
          "api-key": process.env.AADHAAR_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.response_code === 1) {
      await cabdriverModel.findOneAndUpdate(
        { _id: req.user },
        { rc_number: req.body.rc_number }
      );
      return res.status(200).send({
        status: response.data.response_code === 1 ? true : false,
        data: response.data,
        message: response.data.message,
      });
    } else {
      return res
        .status(200)
        .send({ status: false, data: {}, message: response.data.message });
    }
  }catch(err){
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "server error",
    });
  }
},
  add_bank_detail : async (req, res) => {
  try {
    if (!/^\d{9,18}$/.test(req.body.account_number)) {
      return res
        .status(200)
        .send({ status: false, data: {}, message: "Invalid account number" });
    }
    if (!/^[A-Za-z]{4}\d{7}$/) {
      return res
        .status(200)
        .send({ status: false, data: {}, message: "Invalid IFSC number" });
    }
    const data = await cabdriverModel.findOneAndUpdate(
      { _id: req.user },
      {
        bank_account_detail: {
          account_type: req.body.account_type,
          account_holder_name: req.body.account_holder_name,
          account_number: req.body.account_number,
          ifsc_code: req.body.ifsc_code,
        },
      }
    );
    return res.status(200).send({
      status: true,
      data,
      message: "Bank detail updated successfully",
    });
  } catch (err) {
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "server error",
    });
  }
},

  // update_user_detail : async (req, res) => {
  //   try {
  //     if (req.body.fullName && req.body.email && req.body.mobileNumber) {
  //       const data = await cabdriverModel.findOneAndUpdate(
  //         { _id: req.user },
  //         {
  //           fullName: req.body.fullName,
  //           email: req.body.email,
  //           mobileNumber: req.body.mobileNumber,
  //         },
  //         { new: true }
  //       );
        
  //       return res.status(200).json({
  //         status: true,
  //         data,
  //         message: "User detail updated successfully",
  //       });
  //     }
  //     if (
  //       !req.body.dl_img ||
  //       req.body.dl_img === "" ||
  //       !req.body.vehicle_reg_img ||
  //       req.body.vehicle_reg_img === "" ||
  //       !req.body.vehicle_image ||
  //       req.body.vehicle_image === "" ||
  //       !req.body.profile_img ||
  //       req.body.profile_img === "" ||
  //       !req.body.aadhaar_img ||
  //       req.body.aadhaar_img === ""
  //     ) {
  //       return res.status(400).send({
  //         status: false,
  //         data: {},
  //         message: "All document required",
  //       });
  //     }
  //     if (
  //       req.body.total_experience &&
  //       req.body.vehicle_model &&
  //       req.body.vehicle_category &&
  //       req.body.vehicle_number &&
  //       req.body.year_of_registration &&
  //       req.body.fullName &&
  //       req.body.email &&
  //       req.body.mobileNumber &&
  //       req.body.alternateNumber &&
  //       req.body.bloodGroup &&
  //       req.body.pincode &&
  //       req.body.address &&
  //       req.body.dob &&
  //       req.body.user_type
  //     ) {
  //       const updateData = {
  //         dl_img: req.body.dl_img ? await aws.uploadToS3(req.body.dl_img) : undefined,
  //         vehicle_reg_img: req.body.vehicle_reg_img ? await aws.uploadToS3(req.body.vehicle_reg_img) : undefined,
  //         vehicle_image: req.body.vehicle_image ? await aws.uploadToS3(req.body.vehicle_image) : undefined,
  //         profile_img: req.body.profile_img ? await aws.uploadToS3(req.body.profile_img) : undefined,
  //         aadhaar_img: req.body.aadhaar_img ? await aws.uploadToS3(req.body.aadhaar_img) : undefined,
  //         total_experience: req.body.total_experience,
  //         vehicle_model: req.body.vehicle_model,
  //         vehicle_category: req.body.vehicle_category,
  //         vehicle_number: req.body.vehicle_number,
  //         year_of_registration: req.body.year_of_registration,
  //         fullName: req.body.fullName,
  //         email: req.body.email,
  //         mobileNumber: req.body.mobileNumber,
  //         alternateNumber: req.body.alternateNumber,
  //         bloodGroup: req.body.bloodGroup,
  //         pincode: req.body.pincode,
  //         address: req.body.address,
  //         dob: req.body.dob,
  //         user_type: req.body.user_type,
  //       };
  //       const data = await cabdriverModel.findOneAndUpdate(
  //         { _id: req.user },
  //         { $set: updateData },  // Use $set to update or add fields
  //         { new: true, runValidators: true }
  //       );
  //       console.log(data);
  //       return res.status(200).send({
  //         status: true,
  //         data: {},
  //         message: "User detail updated successfully",
  //       });
  //     }
  
  //     return res
  //       .status(200)
  //       .json({ status: true, data: {}, message: "No data updated" });
  //   } catch (err) {
  //     console.log(err);
  //     return res.status(500).json({
  //       status: false,
  //       data: { errorMessage: err.message },
  //       message: "server error",
  //     });
  //   }
  // },

  update_user_detail: async (req, res) => {
    try {
      // Fetch the existing document to ensure it exists
      const existingDocument = await cabdriverModel.findById(req.user);
      
      if (!existingDocument) {
        return res.status(404).json({
          status: false,
          data: {},
          message: "User not found",
        });
      }
  
      // Prepare update object
      const updateData = {};
  
      if (req.body.fullName) updateData.fullName = req.body.fullName;
      if (req.body.email) updateData.email = req.body.email;
      if (req.body.mobileNumber) updateData.mobileNumber = req.body.mobileNumber;
  
      if (req.body.dl_img) updateData.dl_img = await aws.uploadToS3(req.body.dl_img);
      if (req.body.vehicle_reg_img) updateData.vehicle_reg_img = await aws.uploadToS3(req.body.vehicle_reg_img);
      if (req.body.vehicle_image) updateData.vehicle_image = await aws.uploadToS3(req.body.vehicle_image);
      if (req.body.profile_img) updateData.profile_img = await aws.uploadToS3(req.body.profile_img);
      if (req.body.aadhaar_img) updateData.aadhaar_img = await aws.uploadToS3(req.body.aadhaar_img);
  
      if (req.body.total_experience) updateData.total_experience = req.body.total_experience;
      if (req.body.vehicle_model) updateData.vehicle_model = req.body.vehicle_model;
      if (req.body.vehicle_category) updateData.vehicle_category = req.body.vehicle_category;
      if (req.body.vehicle_number) updateData.vehicle_number = req.body.vehicle_number;
      if (req.body.year_of_registration) updateData.year_of_registration = req.body.year_of_registration;
      if (req.body.alternateNumber) updateData.alternateNumber = req.body.alternateNumber;
      if (req.body.bloodGroup) updateData.bloodGroup = req.body.bloodGroup;
      if (req.body.pincode) updateData.pincode = req.body.pincode;
      if (req.body.address) updateData.address = req.body.address;
      if (req.body.dob) updateData.dob = req.body.dob;
      if (req.body.user_type) updateData.user_type = req.body.user_type;
  
      if (Object.keys(updateData).length === 0) {
        return res.status(200).json({
          status: true,
          data: {},
          message: "No data to update",
        });
      }
  
      // Perform the update
      const data = await cabdriverModel.findOneAndUpdate(
        { _id: req.user },
        { $set: updateData },
        { new: true, runValidators: true }
      );
  
      return res.status(200).json({
        status: true,
        data,
        message: "User detail updated successfully",
      });
      
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        data: { errorMessage: err.message },
        message: "Server error",
      });
    }
  },
    
  document_upload : async (req, res) => {
  try {
    return await aws.uploadToS3(file.buffer);
  } catch (err) {
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "server error",
    });
  }
},

  updateLocationController : async (req, res) => {
  try {
    const { driver_lat, driver_lng } = req.body;
    const driver_id = req.user;

    // Validate input
    if (!driver_id || isNaN(driver_lat) || isNaN(driver_lng)) {
      return res.status(400).json({ status: false, message: 'Invalid input parameters', data: {} });
    }

    const driver = await cabdriverModel.findById(driver_id);
    if(driver){
    // Update the driver's location
    const result = await cabdriverModel.updateOne(
      { _id: driver_id },
      { $set: { 'location.coordinates': [parseFloat(driver_lat), parseFloat(driver_lng)], 'location.type' : "Point",
                'is_on_duty': true
       } },
       {upsert: true}
    );

    // Check if the update was successful
    if (result.nModified === 0) {
      return res.status(404).json({ status: false, message: 'Driver not found or location unchanged', data: {} });
    }


    // Send success response
    return res.status(200).json({
      status: true,
      message: 'Location updated successfully',
      data: {}
    });
  }
  return res.status(400).json({
    status:false,
    message:"Driver does not exists",
    data:{}
  })

  } catch (error) {
    // Handle errors
    console.error('Error updating driver location:', error.message);
    return res.status(500).json({
      status: false,
      message: 'Failed to update driver location',
      data: { errorMessage: error.message }
    });
  }
},


  updateDutyController : async (req, res) => {
  try {
    const {is_on_duty } = req.body;
    const driver_id = req.user;
    

    const driver = await cabdriverModel.findById(driver_id);
    if(driver){
    // Update the driver's location
    const result = await cabdriverModel.updateOne(
      { _id: driver_id },
      { $set: { 'is_on_duty': is_on_duty } }
    );

    // Check if the update was successful
    if (result.nModified === 0) {
      return res.status(404).json({ status: false, message: 'Driver not found or duty unchanged', data: {} });
    }


    // Send success response
    return res.status(200).json({
      status: true,
      message: 'Duty status updated successfully',
      data: {}
    });
  }
  return res.status(400).json({
    status:false,
    message:"Driver does not exists",
    data:{}
  })

  } catch (error) {
    // Handle errors
    console.error('Error updating driver duty status:', error.message);
    return res.status(500).json({
      status: false,
      message: 'Failed to update driver duty status',
      data: { errorMessage: error.message }
    });
  }
},
reqAcceptController: async(req,res) =>{
  try {
    const driver_id = req.user; // Ensure req.user is correctly set by authentication middleware
    const { ride_id, status_accept } = req.body;
    const io = req.app.get('io');

    // Validate input
    if (!ride_id || status_accept === undefined) {
      return res.status(400).json({ status: false, message: 'Missing ride_id or status_accept', data: {} });
    }

    // Find the driver and ride
    
    const ride = await Ride.findById(ride_id);
    const driver = await cabdriverModel.findById(driver_id);

    if (!driver) {
      throw new Error('Driver not found');
    }

    if (!ride) {
      throw new Error('Ride does not exist');
    }

    // Convert string to ObjectId
    const driverIdString = ride.driverId.toString();


if(ride.status !== "Pending" || driverIdString !== driver_id){
  console.log(driverIdString);
  console.log(driver_id);
  return res.status(200).json({status:false, message:"Ride has been cancelled by the user or transferred to other driver", data:{}})
}

    // Update driver and ride status
    ride.status_accept = status_accept;

    //save otp if driver accepts the ride
if(status_accept === true){
  ride.otp = (Math.floor(1000 + Math.random() * 9000)).toString();
  ride.status = "Accepted";
  driver.on_going_ride_id = ride_id;
}
  await driver.save();
   const savedRide = await ride.save(); // Save changes to the ride

   function parseDuration(duration) {
    const hoursMatch = duration.match(/(\d+)\s*hours?/);
    const minsMatch = duration.match(/(\d+)\s*mins?/);
    
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
    
    return (hours * 60 * 60 * 1000) + (mins * 60 * 1000); // milliseconds
}

// Get current time
const date = new Date();
const options = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
const currentTime = date.toLocaleTimeString('en-US', options);

// Parse pickup duration and calculate pickup time
const durationMs = parseDuration(savedRide.pickup_duration);
const pickupDate = new Date(date.getTime() + durationMs);

// Format pickup time
const pickupTimeOptions = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
const pickupTimeString = pickupDate.toLocaleTimeString('en-US', pickupTimeOptions);

   const rideData = {
    driver_image: driver.profile_img || "https://images.unsplash.com/photo-1504620776737-8965fde5c079?q=80&w=2073&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    driverName : `${driver.firstName} ${driver.lastName}`,
    driver_phone: driver.mobileNumber.toString(),
    pickup_time: pickupTimeString || "",
    user_name: savedRide.user_name,
    trip_distance: savedRide.trip_distance || "", // Assuming trip_distance may not be available
    trip_duration: savedRide.trip_duration || "", // Assuming trip_duration may not be available
    trip_amount: savedRide.trip_amount || "", // Assuming trip_amount may not be available
    pickup_address: savedRide.pickup_address ? savedRide.pickup_address.toString() : "",
    pickup_lat: savedRide.pickup_lat ? savedRide.pickup_lat.toString() : "",
    pickup_lng: savedRide.pickup_lng ? savedRide.pickup_lng.toString() : "",
    drop_address: savedRide.drop_address ? savedRide.drop_address.toString() : "",
    drop_lat: savedRide.drop_lat ? savedRide.drop_lat.toString() : "",
    drop_lng: savedRide.drop_lng ? savedRide.drop_lng.toString() : "",
    pickup_distance: savedRide.pickup_distance || "",
    pickup_duration: savedRide.pickup_duration || "",
    otp: savedRide.otp,
  };


  //find customer to emit data to 
  const customer = await UserModel.findById(savedRide.userId);

  if (!customer) {
    throw new Error('Customer not found');
  }

  if (status_accept === true) {

    customer.on_going_ride_id = savedRide._id;
    await customer.save();
    // io.emit('trip-driver-accepted', rideData);
    io.to(customer.socketId).emit('trip-driver-accepted', rideData)
  } 
  // else if (status_accept===false && savedRide.isSearching === false) {
  //   io.to(customer.socketId).emit('trip-driver-not-found', {message:"All drivers have been notified or no driver is available."});
  // }

    res.status(200).json({
      status: true,
      message: 'Request completed',
      data: `Ride Accepted: ${status_accept}`,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
      data: {},
    });
  }
},
updateIsOnDuty: async (req,res)=>{
  try{

    //check for time according to time zone of database
    const now = moment().tz('Asia/Kolkata');
    const fiveMinutesAgo = now.subtract(5, 'minutes').toISOString();


    const result = await cabdriverModel.updateMany(
        { updatedAt: { $lt: fiveMinutesAgo } },
        { $set: { is_on_duty: false } }
    );

  }catch(error){
    res.status(500).json({status:false, message:error, data:{}})
  }

},
goForPickup : async (req,res) =>{
  try {
    

    const { ride_id } = req.body;
    const io = req.app.get('io');


    // Validate input
    if (!ride_id) {
      return res.status(400).json({ status: false, message: 'Ride ID is required', data: {} });
    }

    // Find the ride and customer
    const ride = await Ride.findById(ride_id).exec();
    if (!ride) {
      return res.status(404).json({ status: false, message: 'Ride not found', data: {} });
    }

    const customer = await UserModel.findById(ride.userId).exec();
    if (!customer) {
      return res.status(404).json({ status: false, message: 'Customer not found', data: {} });
    }

    // Update the ride status
    ride.can_be_cancelled = false;
    ride.status = "PickingUp"
    await ride.save();

    // Emit pickup status to clients
    io.to(customer.socketId).emit('pickup-status', {
      status: ride.status,
      message: 'Driver has left for pickup',
    });

    // Respond to the request
    res.status(200).json({ status: true, message: 'Pickup status updated', data: {} });
  } catch (error) {
    
    // Respond with error status and message
    res.status(500).json({ status: false, message: error, data: {} });
  }
},

startRide : async (req,res)=>{
  try {
    const io = req.app.get('io');
    const { ride_id, otp } = req.body;

    // Validate input
    if (!ride_id || !otp) {
      return res.status(400).json({ status: false, message: 'Ride ID and OTP are required', data: {} });
    }

    // Find the ride and customer
    const ride = await Ride.findById(ride_id).exec();
    if (!ride) {
      return res.status(404).json({ status: false, message: 'Ride not found', data: {} });
    }

    const customer = await UserModel.findById(ride.userId).exec();
    if (!customer) {
      return res.status(404).json({ status: false, message: 'Customer not found', data: {} });
    }

    // Validate OTP
    if (otp !== ride.otp) {
      return res.status(400).json({ status: false, message: 'Invalid OTP', data: {} });
    }

    // Update ride status
    ride.isStarted = true;
    ride.isSearching = false;
    ride.status = "Ongoing"
    ride.startTime = new Date();
    await ride.save();

    // Emit ride start event
    io.to(customer.socketId).emit('pickup-status', {
      status: ride.status,
      message: 'Your ride has started, please enjoy your ride',
    });

    // Respond to the request
    res.status(200).json({ status: true, message: 'Ride started successfully', data: {} });
  } catch (error) {
    // Log error for debugging
    console.error('Error in startRide:', error);

    // Respond with error status and message
    res.status(500).json({ status: false, message: 'Internal server error', data: {} });
  }
},

completeRide : async (req,res) => { 
  try {
    const { ride_id } = req.body;
    const io = req.app.get('io');
    // Fetch ride details
    const ride = await Ride.findById(ride_id)
    .populate('userId')
    .exec();
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Fetch driver details
    const cabdriver = await cabdriverModel.findById(ride.driverId)
      .populate('carDetails') // Populate the carDetails field
      .exec();
    if (!cabdriver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    //save complete time when we hit the api
    ride.completedTime = new Date();
    ride.status = "Completed"
    await ride.save();

    // Remove on_going_ride_id from driver
    await cabdriverModel.updateOne(
      { _id: ride.driverId },
      { $unset: { on_going_ride_id: "" } }
    );
     // Remove on_going_ride_id from customer
     await UserModel.updateOne(
      { _id: ride.userId },
      { $unset: { on_going_ride_id: "" } }
    );

    // Calculate trip time
    const tripTime = new Date(ride.completedTime) - new Date(ride.startTime);
    const formattedTripTime = formatTripTime(tripTime)

    // Calculate extra km charge
    const extraDistance = calculateDistance(cabdriver.location.coordinates[0], cabdriver.location.coordinates[1], ride.drop_lat, ride.drop_lng); 
    const extraKmCharge = Math.round(extraDistance * Number(cabdriver.carDetails[0].extra_km_fare));

//  total fare
    const tripAmount = convertCurrencyStringToNumber(ride.trip_amount);
    const totalFare = Math.round(tripAmount + extraKmCharge) ;


    // Prepare response
    const response = {
      customer_image: ride.userId.profile_img || "https://plus.unsplash.com/premium_photo-1683121366070-5ceb7e007a97?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      customer_name: `${ride.userId.firstName} ${ride.userId.lastName}`,
      pickup_address: ride.pickup_address,
      drop_address: ride.drop_address,
      trip_id: ride._id,
      vehicle_number: cabdriver.vehicle_number,
      date_time_ride: formatDate(ride.startTime),
      trip_time: formattedTripTime,
      distance_travel: ride.trip_distance ,
      distance_fare: ride.trip_amount,
      extra_km_charge: `₹ ${extraKmCharge}`,
      total_amount: `₹ ${totalFare}`
    };

    ride.trip_time = formattedTripTime;
    ride.extra_km_charge= `₹ ${extraKmCharge}`;
    ride.total_amount = `₹ ${totalFare}`;

    await ride.save();

    io.to(ride.userId.socketId).emit('pickup-status', {
      status:"completed",
      message: 'Your ride has been completed'
    });
    return res.status(200).json({status:true, message: "Ride is completed ",data:{...response}});
  } catch (error) {
    console.error(error);
    return res.status(500).json({status:false, message: 'Internal server error', data:{} });
  }
},

configuration : async (req,res)=>{
  try {
    const  driver_id  = req.user;
    const driver = await cabdriverModel.findById(driver_id);

    if (!driver) {
      throw new Error("Driver does not exist");
    }

    // Extract fields from the driver model
    const {
      dl_img,
      vehicle_reg_img,
      vehicle_image,
      profile_img,
      aadhaar_img,
      total_experience,
      vehicle_model,
      vehicle_category,
      vehicle_number,
      year_of_registration,
      fullName,
      email,
      mobileNumber,
      alternateNumber,
      bloodGroup,
      pincode,
      address,
      dob,
      user_type
    } = driver;

    // Determine onboarding_complete based on field presence
    const onboarding_complete = [
      dl_img,
      vehicle_reg_img,
      vehicle_image,
      profile_img,
      aadhaar_img,
      total_experience,
      vehicle_model,
      vehicle_category,
      vehicle_number,
      year_of_registration,
      fullName,
      email,
      mobileNumber,
      alternateNumber,
      bloodGroup,
      pincode,
      address,
      dob,
      user_type
    ].every(field => field && field.toString().trim() !== '');

    const response = {
      is_on_duty: driver.is_on_duty,
      onboarding_complete,
      profile_img: driver.profile_img,
      name: driver.firstName + " " + driver.lastName
    };

    return res.status(200).json({ status: true, message: "Configurations Fetched", data: response });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Internal server error', data: {error} });
  }
},

delete : async (req,res) =>{
  try {
    // Extract driver_id from req.user
    const  driver_id  = req.user;
    
    // Delete the driver account from the database
    const result = await cabdriverModel.findByIdAndDelete(driver_id);

    // Check if the driver was found and deleted
    if (!result) {
      return res.status(404).json({ status: false, message: 'Driver not found', data: {} });
    }

    // Respond with a success message
    return res.status(200).json({ status: true, message: 'Account deleted successfully', data: {} });

  } catch (error) {
    // Handle any unexpected errors
    console.error('Error deleting account:', error);
    return res.status(500).json({ status: false, message: 'Internal server error', data: {} });
  }
},

}

export default cabdriverController;