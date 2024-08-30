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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
  res.render('error');
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
      // Update driver with socketId
      await UserModel.updateOne({ _id: customer_id }, { $set: { socketId: socket.id } });
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