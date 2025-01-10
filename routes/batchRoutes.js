import express from 'express';
import Batch from '../models/batchSchema.js'; // Adjust the path as necessary
import Carton from "../models/cartonIDSchema.js"
import { isAuth } from '../utils.js';

const batchRouter = express.Router();




/**
 * @swagger
 * /batch/create:
 *   post:
 *     tags: [Batch]
 *     summary: Create a new batch
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint allows you to create one or more new batches in the system, generating dynamic batch IDs based on the provided id_prefix and batch size. It also validates input and checks for existing batch IDs.
 *     operationId: createBatch
 *     
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 id_prefix:
 *                   type: string
 *                   description: The prefix for the batch ID (must be 8 characters long)
 *                   example: "BATCH123"
 *                 batch_size:
 *                   type: number
 *                   description: The number of items in each batch entry
 *                   example: 50
 *                 cartonSize:
 *                   type: number
 *                   description: The quantity of items in each carton of this batch
 *                   example: 100
 *                 createdBy:
 *                   type: string
 *                   description: The ID of the user who created the batch
 *                   example: "60d5ec49f1b2c8b1a4e4e4e4"
 *                 count:
 *                   type: number
 *                   description: The number of entries in the whitelist
 *                   example: 10
 *             required:
 *               - id_prefix
 *               - batch_size
 *               - cartonSize
 *               - createdBy
 *               - count
 *     responses:
 *       '201':
 *         description: Batches created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 savedBatches:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Batch'
 *                 savedCartons:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Carton'
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
 *                   example: "No entries in the WhiteList."
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
 *     Batch:
 *       type: object
 *       properties:
 *         batchId:
 *           type: string
 *           description: The unique identifier for the batch, generated dynamically
 *           example: "BATCH1230001"
 *         id_prefix:
 *           type: string
 *           description: The prefix for the batch ID
 *           example: "BATCH123"
 *         batch_size:
 *           type: number
 *           description: The number of items in each batch entry
 *           example: 50
 *         cartonSize:
 *           type: number
 *           description: The quantity of items in the carton of this particular batch
 *           example: 100
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the batch
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the batch was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the batch was last updated
 *     Carton:
 *       type: object
 *       properties:
 *         cartonId:
 *           type: string
 *           description: The unique identifier for the carton, generated dynamically
 *           example: "BATCH1230001-0001"
 *         cartonSize:
 *           type: number
 *           description: The quantity of items in the carton
 *           example: 100
 *         batch_id:
 *           type: string
 *           description: The ID of the batch this carton belongs to
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the carton
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the carton was created
 */

// CREATE
batchRouter.post('/create', isAuth, async (req, res) => {
    try {
        const batches = Array.isArray(req.body) ? req.body : [req.body];

        console.log('Request Body:', batches); // Log the incoming request body

        const batchEntries = [];
        const cartonEntries = [];
        const existingBatchIds = [];

        for (const batch of batches) {
            const { id_prefix, batch_size, cartonSize, createdBy ,count} = batch;

            const whiteListCount = count?count:0;
            if (whiteListCount === 0) {
                return res.status(400).send({ error: "No entries in the WhiteList." });
            }

            // Validate batch_size and cartonSize
            if (!batch_size || batch_size <= 0) {
                return res.status(400).send({ error: "batch_size must be a positive number." });
            }
            if (!cartonSize || cartonSize <= 0) {
                return res.status(400).send({ error: "cartonSize must be a positive number." });
            }

            // Find the last batch ID for the given id_prefix
            const lastBatch = await Batch.findOne({ id_prefix }).sort({ batchId: -1 });

            // Determine the starting number for new batch IDs
            let startNumber = 1;
            if (lastBatch) {
                const lastBatchId = lastBatch.batchId; // e.g., "BATCH1230034"
                const prefixLength = id_prefix.length;
                const lastNumberString = lastBatchId.slice(prefixLength); // Get the part after the prefix
                startNumber = parseInt(lastNumberString, 10) + 1; // Increment from the last number
            }

            // Create new batch IDs based on the batch_size
            const nBatches = Math.ceil(whiteListCount / batch_size);
            for (let i = 0; i < nBatches; i++) {
                const remLength = 12 - id_prefix.length;
                const paddedNumber = String(startNumber + i).padStart(remLength, '0'); // Pad with zeros
                const newBatchId = `${id_prefix}${paddedNumber}`; // Concatenate without hyphen

                // Check if the new batchId already exists
                const existingBatch = await Batch.findOne({ batchId: newBatchId });
                if (existingBatch) {
                    existingBatchIds.push(newBatchId); // Collect existing batch IDs
                } else {
                    // Check if the batchId is 12 characters long
                    if (newBatchId.length !== 12) {
                        return res.status(400).send({ error: `Batch ID "${newBatchId}" must be 12 characters long.` });
                    }

                    batchEntries.push({
                        batchId: newBatchId,
                        id_prefix,
                        batch_size,
                        cartonSize,
                        createdBy:req.user._id
                    });
                }
            }
        }

        if (existingBatchIds.length > 0) {
            console.log('Duplicate Batch IDs:', existingBatchIds); // Debug log
            return res.status(400).send({ message: 'Some Batch IDs already exist.', existingBatchIds });
        }

        // Insert all new batch entries in bulk
        const savedBatches = await Batch.insertMany(batchEntries);
        console.log('Saved Batches:', savedBatches); // Debug log

        // Create cartons for each new batch
        for (const batch of savedBatches) {
            const numberOfCartons = Math.ceil(batch.batch_size / batch.cartonSize);
            let cartonStartNumber=1;
            for (let j = 0; j < numberOfCartons; j++) {
                //Determine the last carton number based on existing cartons
                const lastCarton = await Carton.findOne({ batch_id: batch._id }).sort({ cartonId: -1 });
                

                if (lastCarton) {
                    const lastCartonId = lastCarton.cartonId; // e.g., "BATCH1230034-001"
                    const lastCartonNumber = parseInt(lastCartonId.split('-')[1], 10); // Extract the last number after '-'
                    cartonStartNumber = lastCartonNumber + 1; // Increment from the last carton number
                }

                const totalLength = 16; // Total length of cartonId
                const batchIdLength = batch.batchId.length;
                const paddingLength = totalLength - (batchIdLength + 1); // Subtract length of batchId and hyphen
        
                const paddedCartonNumber = String(cartonStartNumber).padStart(paddingLength, '0'); // Pad with zeros
                const newCartonId = `${batch.batchId}-${paddedCartonNumber}` // Create new carton ID

                // Check if the cartonId is 16 characters long
                if (newCartonId.length !== 16) {
                    return res.status(400).send({ error: `Carton ID "${newCartonId}" must be 16 characters long.` });
                }
                console.log("Batch Object Id",batch._id);
                cartonEntries.push({
                    cartonId: newCartonId,
                    cartonSize:batch.cartonSize,
                    batch_id: batch._id, // Reference to the created batch's ObjectId
                    createdBy:req.user._id
                });
                cartonStartNumber++;
                console.log("Carton Entries", cartonEntries);
            }
        }

        // Insert all new carton entries in bulk
        const savedCartons = await Carton.insertMany(cartonEntries);
        console.log('Saved Cartons:', savedCartons); // Debug log

        res.status(201).send({ savedBatches, savedCartons });
    } catch (error) {
        console.error('Error occurred:', error); // Log the error for debugging
        res.status(500).send({ error: "Internal server error" });
    }
});
/**
 * @swagger
 * /batch/all:
 *   get:
 *     tags: [Batch]
 *     summary: Retrieve all batches
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint retrieves a list of all batches in the system, including the user who created each batch and the current quantity of cartons.
 *     operationId: getAllBatches
 *     responses:
 *       '200':
 *         description: A list of batches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   batchId:
 *                     type: string
 *                     description: The unique identifier for the batch
 *                     example: "BATCH123-0001"
 *                   id_prefix:
 *                     type: string
 *                     description: The prefix for the batch ID
 *                     example: "BATCH123"
 *                   batch_size:
 *                     type: number
 *                     description: The size of the batch
 *                     example: 100
 *                   cartQuantity:
 *                     type: number
 *                     description: The current quantity of cartons in the batch
 *                     example: 10
 *                   createdBy:
 *                     type: string
 *                     description: The ID of the user who created the batch
 *                     example: "60d5ec49f1b2c8b1a4e4e4e4"
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: The date and time when the batch was created
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                     description: The date and time when the batch was last updated
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

// READ
batchRouter.get('/all',isAuth, async (req, res) => {
    try {
        const batches = await Batch.find().populate('createdBy');
        res.status(200).send(batches);
    } catch (error) {
        res.status(500).send(error);
    }
});

/**
 * @swagger
 * /batch/{id}:
 *   get:
 *     tags: [Batch]
 *     summary: Retrieve a batch by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint retrieves a specific batch by its unique identifier, including the user who created it.
 *     operationId: getBatchById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the batch
 *         schema:
 *           type: string
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *     responses:
 *       '200':
 *         description: Batch retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batchId:
 *                   type: string
 *                   description: The unique identifier for the batch
 *                   example: "BATCH123"
 *                 id_prefix:
 *                   type: string
 *                   description: The prefix for the batch ID
 *                   example: "PREFIX"
 *                 batch_size:
 *                   type: number
 *                   description: The size of the batch
 *                   example: 100
 *                 cartQuantity:
 *                   type: number
 *                   description: The quantity of items in the cart
 *                   example: 10
 *                 createdBy:
 *                   type: string
 *                   description: The ID of the user who created the batch
 *                   example: "60d5ec49f1b2c8b1a4e4e4e4"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: The date and time when the batch was created
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: The date and time when the batch was last updated
 *       '404':
 *         description: Batch not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Batch not found"
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

batchRouter.get('/:id',isAuth, async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id).populate('createdBy');
        if (!batch) {
            return res.status(404).send();
        }
        res.status(200).send(batch);
    } catch (error) {
        res.status(500).send(error);
    }
});

/**
 * @swagger
 * /batch/{id}:
 *   patch:
 *     tags: [Batch]
 *     summary: Update a batch by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint updates a specific batch identified by its unique ID. Only allowed fields can be updated.
 *     operationId: updateBatchById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the batch to update
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
 *               batchId:
 *                 type: string
 *                 description: The unique identifier for the batch
 *                 example: "BATCH123"
 *               id_prefix:
 *                 type: string
 *                 description: The prefix for the batch ID
 *                 example: "PREFIX"
 *               batch_size:
 *                 type: number
 *                 description: The size of the batch
 *                 example: 150
 *               cartQuantity:
 *                 type: number
 *                 description: The quantity of items in the cart
 *                 example: 20
 *             additionalProperties: false
 *     responses:
 *       '200':
 *         description: Batch updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batchId:
 *                   type: string
 *                   description: The unique identifier for the batch
 *                   example: "BATCH123"
 *                 id_prefix:
 *                   type: string
 *                   description: The prefix for the batch ID
 *                   example: "PREFIX"
 *                 batch_size:
 *                   type: number
 *                   description: The updated size of the batch
 *                   example: 150
 *                 cartQuantity:
 *                   type: number
 *                   description: The updated quantity of items in the cart
 *                   example: 20
 *                 createdBy:
 *                   type: string
 *                   description: The ID of the user who created the batch
 *                   example: "60d5ec49f1b2c8b1a4e4e4e4"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: The date and time when the batch was created
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: The date and time when the batch was last updated
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
 *         description: Batch not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Batch not found"
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


// UPDATE with PATCH
batchRouter.patch('/:id',isAuth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['batchId', 'quantity', 'createdBy'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    try {
        const batch = await Batch.findById(req.params.id);

        if (!batch) {
            return res.status(404).send();
        }

        // Update only the specified fields
        updates.forEach((update) => (batch[update] = req.body[update]));
        await batch.save();
        res.status(200).send(batch);
    } catch (error) {
        res.status(400).send(error);
    }
});

/**
 * @swagger
 * /batch/{id}:
 *   delete:
 *     tags: [Batch]
 *     summary: Delete a batch by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint deletes a specific batch identified by its unique ID.
 *     operationId: deleteBatchById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the batch to delete
 *         schema:
 *           type: string
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *     responses:
 *       '200':
 *         description: Batch deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batchId:
 *                   type: string
 *                   description: The unique identifier for the deleted batch
 *                   example: "BATCH123"
 *                 id_prefix:
 *                   type: string
 *                   description: The prefix for the deleted batch ID
 *                   example: "PREFIX"
 *                 batch_size:
 *                   type: number
 *                   description: The size of the deleted batch
 *                   example: 100
 *                 cartQuantity:
 *                   type: number
 *                   description: The quantity of items in the deleted batch
 *                   example: 10
 *                 createdBy:
 *                   type: string
 *                   description: The ID of the user who created the batch
 *                   example: "60d5ec49f1b2c8b1a4e4e4e4"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: The date and time when the batch was created
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: The date and time when the batch was last updated
 *       '404':
 *         description: Batch not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Batch not found"
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


// DELETE
batchRouter.delete('/:id',isAuth, async (req, res) => {
    try {
        const batch = await Batch.findByIdAndDelete(req.params.id);

        if (!batch) {
            return res.status(404).send();
        }

        res.status(200).send(batch);
    } catch (error) {
        res.status(500).send(error);
    }
});

export default batchRouter;
