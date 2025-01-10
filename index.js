import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv"
import cors from "cors"
import userRouter from "./routes/userRoutes.js";
import whiteListRouter from "./routes/whiteListRoutes.js";
import packListRouter from "./routes/packListRoutes.js";
import mappingRouter from "./routes/mappingRoutes.js";
import lifeCycleRouter  from "./routes/lifeCycleRoutes.js"
import cartonIDRouter from "./routes/cartonIDRoutes.js"
import batchRouter from "./routes/batchRoutes.js"
import logger from "./logger.js";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express"

const app=express();
dotenv.config();
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      logger.error(`Client error: ${res.statusCode} - ${req.method} ${req.url}`);
    } else if (res.statusCode >= 500) {
      logger.error(`Server error: ${res.statusCode} - ${req.method} ${req.url}`);
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      logger.info(`Response: ${res.statusCode} - ${req.method} ${req.url}`);
    }
  });
  next();
});
const allowedOrigins = [
  'http://localhost:5173',
  'http://www.localhost',
  'http://13.233.79.154'
];

const corsOptions = {
  origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
          callback(null, true);
      } else {
          const error = new Error('Not allowed by CORS');
          logger.error(`CORS error: ${error.message} - Origin: ${origin}`);
          callback(error);
      }
  },
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Allow all methods
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'], // Allow all headers
};
const swaggerOptions = {
    swaggerDefinition: {
      openapi: '3.0.0',
      info: {
        title: 'GPS TRACKER Portal APIs',
        version: '1.0.0',
        description: 'API Documentation',
      },
      servers: [
        {
            url: 'http://13.233.79.154/', // Base URL for your API
            description: 'Local server'
        }
    ],
    tags: [
      { name: 'Batch', description: 'Operations related to batches' },
      { name: 'Carton', description: 'Operations related to cartons' },
      { name: 'LifeCycle', description: 'Operations related to lifecycle management' },
      { name: 'Mapping', description: 'Operations related to mapping' },
      { name: 'PackList', description: 'Operations related to packing lists' },
      { name: 'User', description: 'Operations related to users' },
      { name: 'WhiteList', description: 'Operations related to whitelists' },
      { name: 'Auth', description:'Operations related to signin/signup'}
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT token in the format **Bearer {token}** to access this endpoint.' // Optional, just for documentation purposes
            }
        }
    },
    security: [
        {
            bearerAuth: []
        }
    ]
    },
    apis: ['./routes/*.js'], // Path to the API docs
  };
app.use(cors(corsOptions));
app.use(express.json());
const username = process.env.MONGO_INITDB_ROOT_USERNAME;
const password = process.env.MONGO_INITDB_ROOT_PASSWORD;
const dbName = 'gpstracker';
const authSource = 'admin';
const MONGODB_URI = `mongodb://${username}:${password}@mongodb:27017/${dbName}?authSource=${authSource}`;
const TEST_MONGODB_URI='mongodb://localhost:27017/gpstracker'
// const MONGODB_URI = `mongodb://${username}:${password}@mongodb:27017/${dbName}?authSource=admin`;
mongoose.connect(MONGODB_URI).then(()=>{
    logger.info('Connected to DB');
    }).catch((err)=>{
      logger.info(err.message);
    });
const swaggerDocs=swaggerJSDoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use('/whitelist',whiteListRouter);
app.use('/packlist',packListRouter);
app.use('/mapping',mappingRouter);
app.use('/lifecycle',lifeCycleRouter);
app.use('/cartonid',cartonIDRouter);
app.use('/batch',batchRouter);
app.use('/users',userRouter);

  
  // Example usage
  logger.info('This is an info message');
  logger.error('This is an error message');
  logger.debug('This is a debug message');
  // console.log = (message) => logger.info(message);
const PORT=process.env.PORT || 5000;
app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.listen(PORT,()=>{
    logger.info(`Server is running at port: ${PORT}`);
 
})