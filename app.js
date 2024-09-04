import createError from 'http-errors';
import express from 'express';
import cors from 'cors';
import http from 'http'
import bodyParser from 'body-parser';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import multer from 'multer';
import dbCon from './lib/db.js'; 
import cabdriverRoute from './routes/cabdriver.js';
import swaggerUi from 'swagger-ui-express';
import { Server as SocketIOServer } from 'socket.io';
import {UserModel} from "./model/user.model.js"
import cron from 'node-cron'
import cabdriverController from './controller/cabdriver.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Ride from './model/ride.model.js';
import cabdriverModel from './model/cabdriver.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const app = express();

const server = http.createServer(app);
const io = new SocketIOServer(server);

// Dynamically import JSON file with assertions
const swaggerDocument = await import('./public/swagger.json', {
  assert: { type: 'json' }
});

// Serve Swagger API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument.default));

//setting io instance for req.app
app.set('io',io);


app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, authorization');
  next();
});

app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer().any());

if (app.get('env') === 'development') {
  app.use(logger('dev'));
}

app.use('/api/cabdriver', cabdriverRoute);

app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.json({
    status: false,
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {},
  });
});

server.listen(8000, '0.0.0.0', () => {
  console.log(`Server started on port ${8000}`);
});

//cron scheduler for drivers location updation and is_on_duty
cron.schedule('* * * * *', () => {
  console.log('Running scheduled task to update driver statuses');
  cabdriverController.updateIsOnDuty();
});

io.on('connection', (socket) => {  
  console.log('New client connected', socket.id);

  // Handle customer registration
  socket.on('register-customer', async (customer_id) => {
    try {
      // Update customer with socketId
      const customer = await UserModel.findOneAndUpdate(
        { _id: customer_id },
        { $set: { socketId: socket.id } },
        { new: true }
      ).populate({
        path: 'on_going_ride_id',
        populate: {
          path: 'driverId', // Assuming 'driverId' is the reference in the ongoing ride
          model: 'Driver' // Ensure this is the correct model name
        }
      }).exec();
  
      if (customer.on_going_ride_id) {
        const ongoingRide = customer.on_going_ride_id;
        const driver = ongoingRide.driverId;
  
        // Function to parse duration and calculate milliseconds
        function parseDuration(duration) {
          const hoursMatch = duration.match(/(\d+)\s*hours?/);
          const minsMatch = duration.match(/(\d+)\s*mins?/);
          const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
          const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
          return (hours * 60 * 60 * 1000) + (mins * 60 * 1000); // milliseconds
        }
  
        // Parse pickup duration and calculate pickup time
        const durationMs = parseDuration(ongoingRide.pickup_duration);
        const pickupDate = new Date(); // Use current date or adjust as needed
        pickupDate.setTime(pickupDate.getTime() + durationMs);
  
        // Format pickup time
        const pickupTimeOptions = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
        const pickupTimeString = pickupDate.toLocaleTimeString('en-US', pickupTimeOptions);
  
        const rideData = {
          ride_id: ongoingRide._id,
          driver_image: driver.profile_img || "https://images.unsplash.com/photo-1504620776737-8965fde5c079?q=80&w=2073&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          driverName: `${driver.firstName} ${driver.lastName}`,
          driver_phone: driver.mobileNumber.toString(),
          pickup_time: pickupTimeString || "",
          user_name: ongoingRide.user_name,
          trip_distance: ongoingRide.trip_distance || "",
          trip_duration: ongoingRide.trip_duration || "",
          trip_amount: ongoingRide.trip_amount || "",
          pickup_address: ongoingRide.pickup_address ? ongoingRide.pickup_address.toString() : "",
          pickup_lat: ongoingRide.pickup_lat ? ongoingRide.pickup_lat.toString() : "",
          pickup_lng: ongoingRide.pickup_lng ? ongoingRide.pickup_lng.toString() : "",
          drop_address: ongoingRide.drop_address ? ongoingRide.drop_address.toString() : "",
          drop_lat: ongoingRide.drop_lat ? ongoingRide.drop_lat.toString() : "",
          drop_lng: ongoingRide.drop_lng ? ongoingRide.drop_lng.toString() : "",
          pickup_distance: ongoingRide.pickup_distance || "",
          pickup_duration: ongoingRide.pickup_duration || "",
          otp: ongoingRide.otp,
          status: ongoingRide.status
        };
  
        console.log(rideData);
  
        // Emit the ride data
        io.to(customer.socketId).emit('restart-ride-status', rideData);
      } else {
        console.log("No ongoing ride for the registered customer");
      }
  
      console.log(`Customer ${customer_id} registered with socketId ${socket.id}`);
    } catch (error) {
      console.error('Error registering customer:', error);
    }
  });

  // Example event handlers
  socket.on('ride-request', (data) => {
    console.log('Received ride-request with data:', data);
    socket.emit('responseEvent', { message: 'Data received' });
  });

  socket.on('message', (data) => {
    console.log('Received message with data:', data);
    socket.emit('responseEvent', { message: 'Data received' });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// function to emit no drivers available to customers
setInterval(async () => {
  try {
    // Track notified drivers
    const notifiedDrivers = new Set();

    // Find rides with no drivers available
    const rides = await Ride.find({
      isSearching: false,
      status: 'Pending',
      status_accept: false,
      notificationSent: false
    });

    for (const ride of rides) {
      const customer = await UserModel.findById(ride.userId);
      if (customer && customer.socketId) {
        // Only send notification if the driver hasn't been notified in this interval
        if (!notifiedDrivers.has(customer.socketId)) {
          console.log("Firing to", customer);
          io.to(customer.socketId).emit('trip-driver-not-found', { message: 'All drivers have been notified or no driver is available.' });
          notifiedDrivers.add(customer.socketId); // Mark driver as notified
        }
      }

      // Update ride status and notification flag
      ride.status = "Unfulfilled";
      ride.notificationSent = true; // Set flag to true to avoid re-sending
      await ride.save();
    }
  } catch (error) {
    console.error('Error in checkAvailableDrivers:', error.message);
  }
}, 20000);