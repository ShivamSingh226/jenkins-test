import express from "express";
import Carton from "../models/cartonIDSchema.js";
import Batch from "../models/batchSchema.js";
import PackList from "../models/packListSchema.js";
import { isAuth } from '../utils.js';
const cartonRouter = express.Router();

/**
 * @swagger
 * /cartonid/create:
 *   post:
 *     tags: [Carton]
 *     summary: Create a new carton
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint allows you to create a new carton in the system.
 *     operationId: createCarton
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cartonId:
 *                 type: string
 *                 description: The unique identifier for the carton
 *                 example: "CARTON123"
 *               
 *               createdBy:
 *                 type: string
 *                 description: The ID of the user who created the carton
 *                 example: "60d5ec49f1b2c8b1a4e4e4e4"
 *               cartonSize:
 *                 type: number
 *                 description: Number of devices in a carton
 *                 example: 50
 *             required:
 *               - batchId
 *               - createdBy
 *               - cartonSize
 *     responses:
 *       '201':
 *         description: Carton created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Carton'
 *       '400':
 *         description: Bad request, invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Validation failed"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Carton:
 *       type: object
 *       properties:
 *         cartonId:
 *           type: string
 *           description: The unique identifier for the carton
 *           example: "CARTON123"
 *         cartonSize:
 *           type: number
 *           description: Number of devices in a carton
 *           example: 50
 *         
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the carton
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the carton was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the carton was last updated
 */


// CREATE
cartonRouter.post('/create',isAuth, async (req, res) => {
    try {
        const { batchId, cartonSize, createdBy } = req.body;

        console.log('Request Body:', req.body); // Log the incoming request body

        // Validate that the batchId exists in the Batch collection
        const batch = await Batch.findOne({ batchId });
        if (!batch) {
            console.log('Batch not found for ID:', batchId); // Debug log
            return res.status(400).send({ message: 'Batch ID does not exist.' });
        }

        // Calculate total cartons based on batch_size from the Batch schema
        const totalCartons = Math.floor(batch.batch_size / cartonSize); // Calculate total cartons
        console.log('Total Cartons to Create:', totalCartons); // Debug log

        if (totalCartons <= 0) {
            return res.status(400).send({ message: 'Batch size must be greater than carton size.' });
        }

        const cartonEntries = [];

        for (let i = 1; i <= totalCartons; i++) {
            // Generate cartonId by appending the carton number to the batchId
            const paddedNumber = String(i).padStart(4, '0'); // Pad the carton number
            const cartonId = `${batchId}-${paddedNumber}`;
            console.log('Generated Carton ID:', cartonId); // Debug log
            
            // Ensure cartonId is 16 characters long excluding hyphen
            if (cartonId.replace(/-/g, '').length !== 16) {
                console.log('Carton ID length mismatch:', cartonId); // Debug log
                return res.status(400).send({ message: 'Carton ID must be 16 characters long excluding hyphen.' });
            }

            cartonEntries.push({
                cartonId,
                cartonSize,
                batchId: batch._id,
                createdBy
            });
        }

        // Insert all carton entries in bulk
        const savedEntries = await Carton.insertMany(cartonEntries);
        console.log('Saved Entries:', savedEntries); // Debug log

        // Increment the cartQuantity in the Batch document
        batch.cartQuantity += totalCartons; // Increment by the number of cartons created
        await batch.save(); // Save the updated batch

        res.status(201).send(savedEntries);
    } catch (error) {
        console.error('Error occurred:', error); // Log the error for debugging
        res.status(500).send({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /cartonid/all:
 *   get:
 *     tags: [Carton]
 *     summary: Retrieve all cartons
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint retrieves a list of all cartons in the system, including associated batch and user information.
 *     operationId: getAllCartons
 *     responses:
 *       '200':
 *         description: A list of cartons retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Carton'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Internal server error"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Carton:
 *       type: object
 *       properties:
 *         cartonId:
 *           type: string
 *           description: The unique identifier for the carton
 *           example: "CARTON123"
 *         cartonSize:
 *           type: number
 *           description: Number of devices in a carton
 *           example: 50
 *         
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the carton
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the carton was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the carton was last updated
 */

// READ
cartonRouter.get('/all',isAuth, async (req, res) => {
    try {
        const cartons = await Carton.find().populate('batch_id createdBy');
        res.status(200).send(cartons);
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
});

/**
 * @swagger
 * /cartonid/filter:
 *   get:
 *     tags: [Carton]
 *     summary: Retrieve the latest carton not present in the pack list
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint retrieves the latest carton that is not present in the pack list, including associated batch and user information.
 *     operationId: getLatestCarton
 *     responses:
 *       '200':
 *         description: Latest carton retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Carton'
 *       '404':
 *         description: No cartons available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Message indicating no cartons are available
 *                   example: "No cartons available"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Internal server error"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Carton:
 *       type: object
 *       properties:
 *         cartonId:
 *           type: string
 *           description: The unique identifier for the carton
 *           example: "CARTON123"
 *         cartonSize:
 *           type: number
 *           description: Number of devices in a carton
 *           example: 50
 *         
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the carton
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the carton was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the carton was last updated
 */
// GET request for fetching all the occupied CartonID from packlist and then filter (CartonID in CartonIDSchema !== CartonID in packlistSchema), sort in ascending order on all the cartons of a particular batch and choose the first one
cartonRouter.get('/filter', isAuth, async (req, res) => {
    try {
        // Get all carton IDs from the packList
        const packList = await PackList.find().populate('cartonID');
        
        const packListCartonIDs = packList.map(item => {
             // Log each cartonID
            return item.cartonID ? item.cartonID.cartonId : null; // Safely access cartonId
        }).filter(id => id !== null); //
        // Find all cartons and filter out those present in the packList
        const cartons = await Carton.find().populate('createdBy');
        
        const filteredCartons = cartons.filter(carton => 
            
            !packListCartonIDs.includes(carton.cartonId)
            
        );
          

        // Sort filtered cartons by cartonId in ascending order
        filteredCartons.sort((a, b) => a.cartonId.localeCompare(b.cartonId));

        // Fetch the latest carton (first element after sorting)
        const latestCarton = filteredCartons.length > 0 ? filteredCartons[0] : null;
        console.log("The latest carton is",latestCarton);
        // Send the latest carton as response
        if (latestCarton) {
            res.status(200).send(latestCarton.cartonId);
        } else {
            res.status(404).send({ message: 'No cartons available' });
        }
    } catch (error) {
        res.status(500).send(error);
    }
});

// UPDATE with PATCH
/**
 * @swagger
 * /cartonid/{id}:
 *   patch:
 *     tags: [Carton]
 *     summary: Update a carton by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint updates a specific carton identified by its unique ID. Only allowed fields can be updated.
 *     operationId: updateCartonById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the carton to update
 *         schema:
 *           type: string
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cartonId:
 *                 type: string
 *                 description: The unique identifier for the carton
 *                 example: "CARTON123"
 *               
 *               createdBy:
 *                 type: string
 *                 description: The ID of the user who created the carton
 *                 example: "60d5ec49f1b2c8b1a4e4e4e4"
 *               cartonSize:
 *                 type: number
 *                 description: Number of devices in the carton
 *                 example: 50
 *             additionalProperties: false
 *     responses:
 *       '200':
 *         description: Carton updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Carton'
 *       '400':
 *         description: Invalid updates or bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Invalid updates!"
 *       '404':
 *         description: Carton not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Carton not found"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Internal server error"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Carton:
 *       type: object
 *       properties:
 *         cartonId:
 *           type: string
 *           description: The unique identifier for the carton
 *           example: "CARTON123"
 *         cartonSize:
 *           type: number
 *           description: Number of devices in a carton
 *           example: 50
 *        
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the carton
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the carton was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the carton was last updated
 */


cartonRouter.patch('/:id', isAuth,async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['cartonId', 'batchId', 'createdBy'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    try {
        const carton = await Carton.findById(req.params.id);

        if (!carton) {
            return res.status(404).send();
        }

        // Update only the specified fields
        updates.forEach((update) => (carton[update] = req.body[update]));
        await carton.save();
        res.status(200).send(carton);
    } catch (error) {
        res.status(400).send(error);
    }
});

/**
 * @swagger
 * /cartonid/{id}:
 *   delete:
 *     tags: [Carton]
 *     summary: Delete a carton by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint deletes a specific carton identified by its unique ID.
 *     operationId: deleteCartonById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the carton to delete
 *         schema:
 *           type: string
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *     responses:
 *       '200':
 *         description: Carton deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Carton'
 *       '404':
 *         description: Carton not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Carton not found"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Internal server error"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Carton:
 *       type: object
 *       properties:
 *         cartonId:
 *           type: string
 *           description: The unique identifier for the carton
 *           example: "CARTON123"
 *         
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the carton
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the carton was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the carton was last updated
 */
// DELETE
cartonRouter.delete('/:id',isAuth, async (req, res) => {
    try {
        const carton = await Carton.findByIdAndDelete(req.params.id);

        if (!carton) {
            return res.status(404).send();
        }

        res.status(200).send(carton);
    } catch (error) {
        res.status(500).send(error);
    }
});

export default cartonRouter;