const axios = require("axios");
const cabdriverModel = require("../model/cabdriver");
const jwt = require("jsonwebtoken");
const aws = require("../aws/aws");

exports.user_signup = async (req, res) => {
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
};
exports.resend_otp = async (req, res) => {
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
};
exports.verify_otp = async (req, res) => {
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
};
exports.user_login = async (req, res) => {
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
};

exports.send_otp_to_aadhaar = async (req, res) => {
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
};

exports.verify_aadhaar = async (req, res) => {
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
};

exports.validate_pan = async (req, res) => {
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
};

exports.validate_driving_license = async (req, res) => {
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
};
exports.validate_rc = async (req,res)=>{
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
}
exports.add_bank_detail = async (req, res) => {
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
};

exports.update_user_detail = async (req, res) => {
  try {
    if (req.body.limitations && req.body.total_work_hour) {
      const data = await cabdriverModel.findOneAndUpdate(
        { _id: req.user },
        {
          driving_hour_limitation: {
            limitations: req.body.limitations,
            total_work_hour: req.body.total_work_hour,
          },
        }
      );
      return res.status(200).send({
        status: true,
        data,
        message: "User detail updated successfully",
      });
    }
    if (req.body.ratingFeedback) {
      const data = await cabdriverModel.findOneAndUpdate(
        { _id: req.user },
        {
          ratingFeedback: req.body.ratingFeedback,
        }
      );
      return res.status(200).send({
        status: true,
        data,
        message: "User detail updated successfully",
      });
    }
    if (req.body.tracking_monitoring) {
      const data = await cabdriverModel.findOneAndUpdate(
        { _id: req.user },
        {
          tracking_monitoring: req.body.tracking_monitoring,
        }
      );
      return res.status(200).send({
        status: true,
        data,
        message: "User detail updated successfully",
      });
    }
    if (
      req.body.total_experience &&
      req.body.vehicle_type
    ) {
      console.log(req.body)
      const data = await cabdriverModel.findOneAndUpdate(
        { _id: req.user },
        {
          dl_img: await aws.uploadToS3(req.body.dl_img),
          vehicle_reg_img: await aws.uploadToS3(req.body.vehicle_reg_img),
          insurance_img: await aws.uploadToS3(req.body.insurance_img),
          road_tax_img: await aws.uploadToS3(req.body.road_tax_img),
          driving_experience: {
            total_experience: req.body.total_experience,
            vehicle_type: req.body.vehicle_type,
          },
        }
      );
      return res.status(200).send({
        status: true,
        data,
        message: "User detail updated successfully",
      });
    }
    if (
      req.body.vehicle_registration &&
      req.body.permit_details &&
      req.body.pending_e_challans
    ) {
      const data = await cabdriverModel.findOneAndUpdate(
        { _id: req.user },
        {
          vehicle: {
            vehicle_registration: req.body.vehicle_registration,
            permit_details: req.body.permit_details,
            pending_e_challans: req.body.pending_e_challans,
          },
        }
      );
      return res.status(200).send({
        status: true,
        data,
        message: "User detail updated successfully",
      });
    }
    if (
      req.body.fullName &&
      req.body.email &&
      req.body.mobileNumber &&
      req.body.pincode
    ) {
      const data = await cabdriverModel.findOneAndUpdate(
        { _id: req.user },
        {
          fullName: req.body.fullName,
          email: req.body.email,
          mobileNumber: req.body.mobileNumber,
          pincode: req.body.pincode,
        }
      );
      return res.status(200).send({
        status: true,
        data,
        message: "User detail updated successfully",
      });
    }
    return res
      .status(200)
      .send({ status: true, data: {}, message: "No data updated" });
  } catch (err) {
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "server error",
    });
  }
};

exports.document_upload = async (req, res) => {
  try {
    return await aws.uploadToS3(file.buffer);
  } catch (err) {
    return res.status(500).send({
      status: false,
      data: { errorMessage: err.message },
      message: "server error",
    });
  }
};

exports.updateLocationController = async (req, res) => {
  try {
    const { driver_id, driver_lat, driver_lng } = req.body;

    // Validate input
    if (!driver_id || isNaN(driver_lat) || isNaN(driver_lng)) {
      return res.status(400).json({ status: false, message: 'Invalid input parameters', data: {} });
    }

    // Update the driver's location
    const result = await cabdriverModel.updateOne(
      { _id: driver_id },
      { $set: { 'location.coordinates': [parseFloat(driver_lng), parseFloat(driver_lat)] } }
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

  } catch (error) {
    // Handle errors
    console.error('Error updating driver location:', error.message);
    return res.status(500).json({
      status: false,
      message: 'Failed to update driver location',
      data: { errorMessage: error.message }
    });
  }
};