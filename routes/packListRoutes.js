import express from 'express';
import PackList from '../models/packListSchema.js'; // Adjust the path as necessary
import { isAuth } from '../utils.js';
const packListRouter = express.Router();
import Carton from '../models/cartonIDSchema.js';
import WhiteList from '../models/whiteListSchema.js';
import Batch from "../models/batchSchema.js"
import Mapping from '../models/mappingSchema.js';
// Hello world


/**
 * @swagger
 * /packlist/create:
 *   post:
 *     tags: [PackList]
 *     summary: Create a new pack list entry
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint creates a new pack list entry with the provided details.
 *     operationId: createPackList
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imei:
 *                 type: string
 *                 description: The IMEI string associated with the mapping
 *                 example: "123456789012345"
 *               serial_No:
 *                 type: string
 *                 description: The serial number string associated with the mapping
 *                 example: "SN1234567890"
 *               deviceId:
 *                 type: string
 *                 description: The device ID string associated with the mapping
 *                 example: "Device123456"
 *               cartonID:
 *                 type: string
 *                 description: The ID of the carton associated with the pack list
 *                 example: "60d5ec49f1b2c8b1a4e4e4e5"
 *               shipmentDate:
 *                 type: string
 *                 format: date-time
 *                 description: The date of shipment
 *                 example: "2024-11-06T00:00:00Z"
 *             required:
 *               - cartonID
 *               - shipmentDate
 *             oneOf:
 *               - required: [imei]
 *               - required: [serial_No]
 *               - required: [deviceId]
 *             additionalProperties: false
 *     responses:
 *       '201':
 *         description: Pack list entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PackList'
 *       '400':
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Invalid request data!"
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
 *     PackList:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the pack list entry.
 *         pmap:
 *           type: string
 *           description: The ID of the mapping associated with the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         cartonID:
 *           type: string
 *           description: The ID of the carton associated with the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e6"
 *         shipmentDate:
 *           type: string
 *           format: date-time
 *           description: The date of shipment
 *           example: "2024-11-06T00:00:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was last updated
 */

// CREATE
packListRouter.post('/create', isAuth, async (req, res) => {
    try {
        // Ensure req.body is an array
        const packLists = Array.isArray(req.body) ? req.body : [req.body];

        // Create an array of promises to handle async operations
        const packListPromises = packLists.map(async (packListData) => {
            let imeiDoc, serialNoDoc, deviceIdDoc, mappingQuery = {};

            // Find the corresponding Object ID based on the provided identifier
            if (packListData.imei) {
                imeiDoc = await WhiteList.findOne({ id: packListData.imei, type: "IMEI" });
                if (!imeiDoc) throw new Error('IMEI not found in WhiteList');
                mappingQuery.imei = imeiDoc._id;
            } else if (packListData.serial_No) {
                serialNoDoc = await WhiteList.findOne({ id: packListData.serial_No, type: "SN" });
                if (!serialNoDoc) throw new Error('Serial No not found in WhiteList');
                mappingQuery.serial_No = serialNoDoc._id;
            } else if (packListData.deviceId) {
                deviceIdDoc = await WhiteList.findOne({ id: packListData.deviceId, type: "DeviceID" });
                if (!deviceIdDoc) throw new Error('Device ID not found in WhiteList');
                mappingQuery.deviceId = deviceIdDoc._id;
            } else {
                throw new Error('No valid identifier provided');
            }

            // Log the found documents
            console.log('IMEI Doc:', imeiDoc);
            console.log('Serial No Doc:', serialNoDoc);
            console.log('Device ID Doc:', deviceIdDoc);

            // Find the corresponding Mapping document
            const mappingDoc = await Mapping.findOne(mappingQuery);

            // Log the mapping document
            console.log('Mapping Doc:', mappingDoc);

            if (!mappingDoc) {
                throw new Error('Mapping not found for the provided identifier');
            }

            // Find the corresponding Carton document
            const cartonDoc = await Carton.findOne({ cartonId: packListData.cartonID });

            // Log the carton document
            console.log('Carton Doc:', cartonDoc);

            if (!cartonDoc) {
                throw new Error('Carton not found for the provided cartonID');
            }

            // Create a new PackList instance with the found Mapping and Carton IDs
            return new PackList({
                pmap: mappingDoc._id,
                cartonID: cartonDoc._id,
                createdBy: req.user._id,
                shipmentDate: packListData.shipmentDate
            });
        });

        // Resolve all promises and save the pack lists
        const packListInstances = await Promise.all(packListPromises);
        const savedPackLists = await PackList.insertMany(packListInstances);

        // Log the saved pack lists
        console.log('Saved Pack Lists:', savedPackLists);

        res.status(201).send(savedPackLists);
    } catch (error) {
        res.status(400).send({ error:"Packlist creation failed!" });
    }
});
/**
 * @swagger
 * /packlist/all:
 *   get:
 *     tags: [PackList]
 *     summary: Retrieve all pack list entries
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint retrieves all pack list entries from the database, including populated fields for mapping, carton, and creator.
 *     operationId: getAllPackLists
 *     responses:
 *       '200':
 *         description: Successfully retrieved all pack list entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PackList'
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
 *     PackList:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the pack list entry.
 *         pmap:
 *           type: string
 *           description: The ID of the mapping associated with the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         cartonID:
 *           type: string
 *           description: The ID of the carton associated with the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e6"
 *         shipmentDate:
 *           type: string
 *           format: date-time
 *           description: The date of shipment
 *           example: "2024-11-06T00:00:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was last updated
 */

// READ
packListRouter.get('/all',isAuth, async (req, res) => {
    try {
        const packLists = await PackList.find()
            .populate({
                path: 'pmap',
                populate: [
                    { path: 'imei', model: 'WhiteList' },
                    { path: 'serial_No', model: 'WhiteList' }
                ]
            })
            .populate('cartonID createdBy');
        
        res.status(200).send(packLists);
    } catch (error) {
        res.status(500).send(error);
    }
});

/**
 * @swagger
 * /packlist/fetchpacklist:
 *   post:
 *     tags: [PackList]
 *     summary: Fetch PackList details
 *     security:
 *       - bearerAuth: []
 *     description: Fetch PackList details based on cartonId, batch_id, or shipmentDate.
 *     operationId: fetchPackList
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: The ID to search for (cartonId, batch_id, or shipmentDate).
 *                 example: "12345"
 *               type:
 *                 type: string
 *                 description: The type of ID (cartonId, batch_id, or shipmentDate).
 *                 example: "cartonId"
 *     responses:
 *       '200':
 *         description: Successfully retrieved the pack list entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PackList'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "ID and type are required"
 *       '404':
 *         description: No matching records found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No matching records found for 12345"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PackList:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the pack list entry.
 *         pmap:
 *           type: object
 *           properties:
 *             imei:
 *               type: object
 *               description: The IMEI details.
 *             serial_No:
 *               type: object
 *               description: The Serial Number details.
 *             deviceId:
 *               type: object
 *               description: The Device ID details.
 *         cartonID:
 *           type: object
 *           description: The Carton details.
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the pack list.
 *         shipmentDate:
 *           type: string
 *           format: date-time
 *           description: The date of shipment.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was last updated.
 */
packListRouter.post('/fetchpacklist', isAuth, async (req, res) => {
    const { id, type } = req.body;
    console.log('Received ID:', id, 'Type:', type);

    if (!id || !type) {
        return res.status(400).send({ error: 'ID and type are required' });
    }

    const trimmedId = String(id).trim();
    console.log('Searching for ID:', trimmedId);

    try {
        let result;

        if (type === 'shipmentDate') {
            const date = new Date(trimmedId);
            const dateString = date.toISOString().split('T')[0]; // Extract the date part

            result = await PackList.find({
                $expr: {
                    $eq: [{ $dateToString: { format: "%Y-%m-%d", date: "$shipmentDate" } }, dateString]
                }
            }).populate({
                path: 'pmap',
                populate: [
                    { path: 'imei', model: 'WhiteList' },
                    { path: 'serial_No', model: 'WhiteList' },
                    { path: 'deviceId', model: 'WhiteList' }
                ]
            }).populate({
                path: 'cartonID',
                populate: { path: 'batch_id' }
            });
        } else if (type === 'cartonId') {
            const carton = await Carton.findOne({ cartonId: trimmedId });
            console.log("The carton is :" ,carton);
            if (!carton) {
                return res.status(404).send({ error: `No matching records found for ${trimmedId}` });
            }
            result = await PackList.find({ cartonID: carton._id }).populate({
                path: 'pmap',
                populate: [
                    { path: 'imei', model: 'WhiteList' },
                    { path: 'serial_No', model: 'WhiteList' },
                    { path: 'deviceId', model: 'WhiteList' }
                ]
            }).populate({
                path: 'cartonID',
                populate: { path: 'batch_id' }
            });
            console.log("The result :",result);
        } else if (type === 'batch_id') {
            const batch = await Batch.findOne({ batchId: trimmedId }).select('_id');
            console.log("The batch is:",batch);
            if (!batch) {
                return res.status(404).send({ error: `No matching records found for ${trimmedId}` });
            }
            result = await PackList.find().populate({
                path: 'cartonID',
                match: { batch_id: batch._id },
                populate: { path: 'batch_id' }
            }).populate({
                path: 'pmap',
                populate: [
                    { path: 'imei', model: 'WhiteList' },
                    { path: 'serial_No', model: 'WhiteList' },
                    { path: 'deviceId', model: 'WhiteList' }
                ]
            });
            console.log("The result for the query:",result);
        } else {
            return res.status(400).send({ error: 'Invalid type provided' });
        }

        if (!result || result.length === 0) {
            return res.status(404).send({ error: `No matching records found for ${trimmedId}` });
        }

        res.status(200).send(result);
    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /packlist/{id}:
 *   get:
 *     tags: [PackList]
 *     summary: Retrieve a pack list entry by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint retrieves a specific pack list entry identified by its unique ID, including populated fields for mapping, carton, and creator.
 *     operationId: getPackListById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the pack list entry to retrieve
 *         schema:
 *           type: string
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *     responses:
 *       '200':
 *         description: Successfully retrieved the pack list entry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PackList'
 *       '404':
 *         description: Pack list entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Pack list entry not found"
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
 *     PackList:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the pack list entry.
 *         pmap:
 *           type: string
 *           description: The ID of the mapping associated with the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         cartonID:
 *           type: string
 *           description: The ID of the carton associated with the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e6"
 *         shipmentDate:
 *           type: string
 *           format: date-time
 *           description: The date of shipment
 *           example: "2024-11-06T00:00:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was last updated
 */
packListRouter.get('/:id', isAuth, async(req, res) => {
    try {
        const packList = await PackList.findById(req.params.id).populate('pmap cartonID createdBy');
        if (!packList) {
            return res.status(404).send();
        }
        res.status(200).send(packList);
    } catch (error) {
        res.status(500).send(error);
    }
});

/**
 * @swagger
 * /packlist/{identifier}:
 *   patch:
 *     tags: [PackList]
 *     summary: Update a pack list entry by identifier
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint updates a specific pack list entry identified by its IMEI, Serial No, or Device ID. Only allowed fields can be updated.
 *     operationId: updatePackListByIdentifier
 *     parameters:
 *       - name: identifier
 *         in: path
 *         required: true
 *         description: The identifier (IMEI, Serial No, or Device ID) of the pack list entry to update
 *         schema:
 *           type: string
 *           example: "123456789012345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cartonID:
 *                 type: string
 *                 description: The ID of the carton associated with the pack list
 *                 example: "60d5ec49f1b2c8b1a4e4e4e5"
 *               shipmentDate:
 *                 type: string
 *                 format: date-time
 *                 description: The date of shipment
 *                 example: "2024-11-06T00:00:00Z"
 *             additionalProperties: false
 *     responses:
 *       '200':
 *         description: Pack list entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PackList'
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
 *         description: Pack list entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Pack list entry not found"
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
 *     PackList:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the pack list entry.
 *         pmap:
 *           type: string
 *           description: The ID of the mapping associated with the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         cartonID:
 *           type: string
 *           description: The ID of the carton associated with the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e6"
 *         shipmentDate:
 *           type: string
 *           format: date-time
 *           description: The date of shipment
 *           example: "2024-11-06T00:00:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was last updated
 */
// UPDATE with PATCH
packListRouter.patch('/:identifier', isAuth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['cartonID', 'shipmentDate'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    try {
        const identifier = req.params.identifier;
        console.log('Received identifier:', identifier);

        // Check the identifier type and find the corresponding WhiteList document
        const whiteListDoc = await WhiteList.findOne({
            id: identifier,
            type: { $in: ["IMEI", "SN", "DeviceID"] }
        });

        if (!whiteListDoc) {
            console.log('Identifier not found in WhiteList');
            return res.status(404).send({ error: 'Identifier not found in WhiteList' });
        }

        console.log('Found WhiteListDoc:', whiteListDoc);

        // Find the corresponding Mapping document using the identifier
        const mappingQuery = {
            $or: [
                { imei: whiteListDoc._id },
                { serial_No: whiteListDoc._id },
                { deviceId: whiteListDoc._id }
            ]
        };

        console.log('Query for Mapping:', mappingQuery);
        const mappingDoc = await Mapping.findOne(mappingQuery);

        if (!mappingDoc) {
            console.log('Mapping entry not found');
            return res.status(404).send({ error: 'Mapping entry not found' });
        }

        console.log('Found Mapping:', mappingDoc);

        // Find the corresponding PackList document using the Mapping ID
        const packList = await PackList.findOne({ pmap: mappingDoc._id });

        if (!packList) {
            console.log('PackList entry not found');
            return res.status(404).send({ error: 'PackList entry not found' });
        }

        console.log('Found PackList:', packList);

        // Update only the specified fields
        for (const update of updates) {
            if (update === 'cartonID') {
                const cartonDoc = await Carton.findOne({ cartonId: req.body.cartonID });
                if (!cartonDoc) {
                    console.log('Carton not found');
                    throw new Error('Carton not found');
                }
                packList.cartonID = cartonDoc._id;
            } else {
                packList[update] = req.body[update];
            }
        }

        await packList.save();
        res.status(200).send(packList);
    } catch (error) {
        console.log('Error:', error.message);
        res.status(400).send({ message: error.message });
    }
});
/**
 * @swagger
 * /packlist/{id}:
 *   delete:
 *     tags: [PackList]
 *     summary: Delete a pack list entry by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint deletes a specific pack list entry identified by its unique ID.
 *     operationId: deletePackListById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the pack list entry to delete
 *         schema:
 *           type: string
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *     responses:
 *       '200':
 *         description: Successfully deleted the pack list entry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PackList'
 *       '404':
 *         description: Pack list entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Pack list entry not found"
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
 *     PackList:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the pack list entry.
 *         pmap:
 *           type: string
 *           description: The ID of the mapping associated with the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         cartonID:
 *           type: string
 *           description: The ID of the carton associated with the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e6"
 *         shipmentDate:
 *           type: string
 *           format: date-time
 *           description: The date of shipment
 *           example: "2024-11-06T00:00:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was last updated
 */

// DELETE
packListRouter.delete('/:id',isAuth, async (req, res) => {
    try {
        const packList = await PackList.findByIdAndDelete(req.params.id);

        if (!packList) {
            return res.status(404).send();
        }

        res.status(200).send(packList);
    } catch (error) {
        res.status(500).send(error);
    }
});
/**
 * @swagger
 * /deleteByCarton/{cartonId}:
 *   delete:
 *     tags: [PackList]
 *     summary: Delete pack list entries by carton ID
 *     security:
 *       - bearerAuth: []
 *     description: This endpoint deletes all pack list entries associated with a given carton ID.
 *     operationId: deletePackListByCartonId
 *     parameters:
 *       - name: cartonId
 *         in: path
 *         required: true
 *         description: The ID of the carton to delete pack list entries for
 *         schema:
 *           type: string
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *     responses:
 *       '200':
 *         description: Successfully deleted pack list entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "X packList entries deleted successfully."
 *       '404':
 *         description: Carton or pack list entries not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No packList entries found for the given cartonID."
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
 *                   example: "An error occurred while deleting packList entries."
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PackList:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the pack list entry.
 *         pmap:
 *           type: string
 *           description: The ID of the mapping associated with the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         cartonID:
 *           type: string
 *           description: The ID of the carton associated with the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the pack list
 *           example: "60d5ec49f1b2c8b1a4e4e4e6"
 *         shipmentDate:
 *           type: string
 *           format: date-time
 *           description: The date of shipment
 *           example: "2024-11-06T00:00:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the pack list entry was last updated
 */

packListRouter.delete('/deleteByCarton/:cartonId', isAuth, async (req, res) => {
    try {
        const { cartonId } = req.params;

        // Find the carton document using the cartonId string
        const carton = await Carton.findOne({ cartonId });
        console.log("The requested carton is:",carton);
        if (!carton) {
            return res.status(404).json({ message: 'Carton not found for the given cartonId.' });
        }
        const packListsToDelete = await PackList.find({ cartonID: carton._id });

        if (packListsToDelete.length === 0) {
            return res.status(404).json({ message: 'No packList entries found for the given cartonID.' });
        }

        // Log the packList entries that are going to be deleted
        console.log("PackList entries to be deleted:", packListsToDelete);

        // Use the found ObjectId to delete packList entries
        const result = await PackList.deleteMany({ cartonID: carton._id });
        console.log("The whitelists entries which were deleted:",result.deletedCount);
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No packList entries found for the given cartonID.' });
        }

        res.status(200).json({ message: `${result.deletedCount} packList entries deleted successfully.` });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while deleting packList entries.' });
    }
});
export default packListRouter;