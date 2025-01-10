import express from 'express'
import LifeCycle from '../models/lifeCycleSchema.js'
import Mapping from '../models/mappingSchema.js';
import WhiteList from '../models/whiteListSchema.js';
import { isAuth } from '../utils.js';
import mongoose from 'mongoose';
const lifecycleRouter=express.Router();

/**
 * @swagger
 * /lifecycle/create:
 *   post:
 *     tags: [LifeCycle]
 *     summary: Create a new lifecycle entry
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint allows you to create a new lifecycle entry in the system.
 *     operationId: createLifeCycle
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
 *               stage:
 *                 type: string
 *                 description: The stage of the lifecycle
 *                 enum:
 *                   - Flash
 *                   - ILQC
 *                   - Giftbox
 *                   - Carton
 *                 example: "Flash"
 *             required:
 *               - stage
 *     responses:
 *       '201':
 *         description: Lifecycle entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LifeCycle'
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
 *     LifeCycle:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the lifecycle entry.
 *         imei:
 *           type: string
 *           description: The ID of the IMEI associated with the lifecycle
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         stage:
 *           type: string
 *           description: The stage of the lifecycle
 *           enum:
 *             - Flash
 *             - ILQC
 *             - Giftbox
 *             - Carton
 *           example: "Flash"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the lifecycle entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the lifecycle entry was last updated
 */

lifecycleRouter.post('/create', isAuth, async (req, res) => {
    try {
        // Ensure req.body is an array
        const lifeCycles = Array.isArray(req.body) ? req.body : [req.body];

        // Create an array of promises to handle async operations
        const lifeCyclePromises = lifeCycles.map(async (lifeCycleData) => {
            let imeiDoc, serialNoDoc, deviceIdDoc, mappingQuery = {};

            if (lifeCycleData.imei) {
                // Directly use the IMEI's ObjectId
                imeiDoc = await WhiteList.findOne({ id: lifeCycleData.imei, type: "IMEI" });
                if (!imeiDoc) throw new Error('IMEI not found in WhiteList');
                return new LifeCycle({
                    imei: imeiDoc._id,
                    stage: lifeCycleData.stage,
                    createdBy: req.user._id
                });
            } else if (lifeCycleData.serial_No) {
                // Find the corresponding Mapping document for Serial No
                serialNoDoc = await WhiteList.findOne({ id: lifeCycleData.serial_No, type: "SN" });
                if (!serialNoDoc) throw new Error('Serial No not found in WhiteList');
                mappingQuery.serial_No = serialNoDoc._id;
            } else if (lifeCycleData.deviceId) {
                // Find the corresponding Mapping document for Device ID
                deviceIdDoc = await WhiteList.findOne({ id: lifeCycleData.deviceId, type: "DeviceID" });
                if (!deviceIdDoc) throw new Error('Device ID not found in WhiteList');
                mappingQuery.deviceId = deviceIdDoc._id;
            } else {
                throw new Error('No valid identifier provided');
            }

            // Log the found documents
            console.log('Serial No Doc:', serialNoDoc);
            console.log('Device ID Doc:', deviceIdDoc);

            // Find the corresponding Mapping document
            const mappingDoc = await Mapping.findOne(mappingQuery).lean();
            console.log('Mapping Doc:', mappingDoc);

            if (!mappingDoc) {
                throw new Error('Mapping not found for the provided identifier');
            }

            // Log the type and value of mappingDoc.imei
            console.log('Type of mappingDoc.imei:', typeof mappingDoc.imei);
            console.log('Value of mappingDoc.imei:', mappingDoc.imei);

            // Ensure mappingDoc.imei is treated as an ObjectId
            const imeiObjectId = new mongoose.Types.ObjectId(mappingDoc.imei);

            // Find the IMEI using the mapping
            imeiDoc = await WhiteList.findOne({ _id: imeiObjectId });
            console.log('IMEI Doc:', imeiDoc);
            if (!imeiDoc) throw new Error('IMEI not found in WhiteList for the provided identifier');

            // Create a new LifeCycle instance with the found IMEI ID
            return new LifeCycle({
                imei: imeiDoc._id,
                stage: lifeCycleData.stage,
                createdBy: req.user._id
            });
        });

        // Resolve all promises and save the life cycles
        const lifeCycleInstances = await Promise.all(lifeCyclePromises);
        const savedLifeCycles = await LifeCycle.insertMany(lifeCycleInstances);

        // Log the saved life cycles
        console.log('Saved Life Cycles:', savedLifeCycles);

        res.status(201).send(savedLifeCycles);
    } catch (error) {
        console.error('Error creating LifeCycle:', error);
        res.status(400).send({ error: "LifeCycle creation failed!" });
    }
});
/**
 * @swagger
 * /lifecycle/all:
 *   get:
 *     tags: [LifeCycle]
 *     summary: Retrieve all lifecycle entries
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint retrieves a list of all lifecycle entries in the system, including associated IMEI information.
 *     operationId: getAllLifeCycles
 *     responses:
 *       '200':
 *         description: A list of lifecycle entries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LifeCycle'
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
 *     LifeCycle:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the lifecycle entry.
 *         imei:
 *           type: string
 *           description: The ID of the IMEI associated with the lifecycle
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         stage:
 *           type: string
 *           description: The stage of the lifecycle
 *           enum:
 *             - Flash
 *             - ILQC
 *             - Giftbox
 *             - Carton
 *           example: "Flash"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the lifecycle entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the lifecycle entry was last updated
 */
// READ
lifecycleRouter.get('/all', isAuth, async (req, res) => {
    try {
        const lifeCycles = await LifeCycle.find()
            .populate({
                path: 'imei',
                model: 'WhiteList'
            });

        res.status(200).send(lifeCycles);
    } catch (error) {
        res.status(500).send(error);
    }
});
/**
 * @swagger
 * /lifecycle/fetch:
 *   post:
 *     tags: [LifeCycle]
 *     summary: Retrieve lifecycle information based on ID and type
 *     security:
 *       - bearerAuth: []
 *     description: This endpoint retrieves lifecycle information based on the provided ID and type (SN, IMEI, or DeviceID), including associated mapping information.
 *     operationId: fetchLifeCycle
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: The ID to search for in the WhiteList.
 *                 example: "SN12300000000005"
 *               type:
 *                 type: string
 *                 enum: [SN, IMEI, DeviceID]
 *                 description: The type of ID being searched.
 *                 example: "SN"
 *     responses:
 *       '200':
 *         description: Lifecycle entry retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lifeCycle:
 *                   type: object
 *                   description: The lifecycle object retrieved from the database.
 *                   $ref: '#/components/schemas/LifeCycle'
 *                 isDispatched:
 *                   type: boolean
 *                   example: true
 *                   description: Indicates if the lifecycle stage is "Carton".
 *       '400':
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "ID and type are required"
 *       '404':
 *         description: Lifecycle entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isDispatched:
 *                   type: boolean
 *                   example: false
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
 *     LifeCycle:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the lifecycle entry.
 *         imei:
 *           type: string
 *           description: The ID of the IMEI associated with the lifecycle
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         stage:
 *           type: string
 *           description: The stage of the lifecycle
 *           enum:
 *             - Flash
 *             - ILQC
 *             - Giftbox
 *             - Carton
 *           example: "Flash"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the lifecycle entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the lifecycle entry was last updated
 */
// Serial Number and IMEI  - fetch then check the mapping if it exists then check the stage of the lifecycle if the stage==carton then already has been dispatched send {dispatch:true || dispatch:false}
lifecycleRouter.post('/fetch', isAuth, async (req, res) => {
    const { id, type } = req.body; // Extract id and type from the request body

    console.log('Received ID:', id, 'Type:', type);

    if (!id || !type) {
        return res.status(400).send({ error: 'ID and type are required' });
    }

    const trimmedId = String(id).trim();
    console.log('Searching for ID:', trimmedId);

    try {
        // Validate the ID against the WhiteList schema based on the type
        const whiteListEntry = await WhiteList.findOne({
            id: trimmedId,
            type: { $in: ['SN', 'IMEI', 'DeviceID'] } // Check for valid types
        });

        if (!whiteListEntry) {
            return res.status(404).send({ isDispatched: false });
        }

        // Check if the IMEI is present in the LifeCycle schema and its stage is "Carton"
        const lifeCycle = await LifeCycle.findOne({ imei: whiteListEntry._id, stage: "Carton" }).populate('imei');

        if (lifeCycle) {
            return res.status(200).send({ lifeCycle, isDispatched: true });
        }

        // Fetch the mapping using the whiteListEntry's ObjectId
        const mapping = await Mapping.findOne({
            $or: [
                { serial_No: whiteListEntry._id },
                { imei: whiteListEntry._id },
                { deviceId: whiteListEntry._id }
            ]
        });

        if (!mapping) {
            return res.status(404).send({ isDispatched: false });
        }

        // Fetch the lifecycle entry using the imei ObjectID from the mapping
        const lifeCycleFromMapping = await LifeCycle.findOne({ imei: mapping.imei }).populate('imei');

        if (!lifeCycleFromMapping) {
            return res.status(404).send({ error: `The lifecycle entry for ${trimmedId} is not present` });
        }

        // Check the stage of the lifecycle
        const isDispatched = lifeCycleFromMapping.stage === "Carton";

        // Return the lifecycle data along with isDispatched status
        res.status(200).send({ lifeCycle: lifeCycleFromMapping, isDispatched });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});
/**
 * @swagger
 * /lifecycle:
 *   patch:
 *     tags: [LifeCycle]
 *     summary: Update a lifecycle entry
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint updates a specific lifecycle entry identified by its IMEI, Serial No, or Device ID. Only allowed fields can be updated.
 *     operationId: updateLifeCycle
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
 *               stage:
 *                 type: string
 *                 description: The stage of the lifecycle
 *                 enum:
 *                   - Flash
 *                   - ILQC
 *                   - Giftbox
 *                   - Carton
 *                 example: "Flash"
 *             required:
 *               - stage
 *             additionalProperties: false
 *     responses:
 *       '200':
 *         description: Lifecycle entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LifeCycle'
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
 *         description: Lifecycle entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Lifecycle entry not found"
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
 *     LifeCycle:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the lifecycle entry.
 *         imei:
 *           type: string
 *           description: The ID of the IMEI associated with the lifecycle
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         stage:
 *           type: string
 *           description: The stage of the lifecycle
 *           enum:
 *             - Flash
 *             - ILQC
 *             - Giftbox
 *             - Carton
 *           example: "Flash"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the lifecycle entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the lifecycle entry was last updated
 */
// UPDATE
lifecycleRouter.patch('/', isAuth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['imei', 'serial_No', 'deviceId', 'stage'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    try {
        let imeiDoc;

        if (req.body.imei) {
            // Find the corresponding Object ID for IMEI
            imeiDoc = await WhiteList.findOne({ id: req.body.imei, type: "IMEI" });
            if (!imeiDoc) throw new Error('IMEI not found in WhiteList');
        } else if (req.body.serial_No) {
            // Find the corresponding Mapping document for Serial No
            const serialNoDoc = await WhiteList.findOne({ id: req.body.serial_No, type: "SN" });
            if (!serialNoDoc) throw new Error('Serial No not found in WhiteList');

            const mappingDoc = await Mapping.findOne({ serial_No: serialNoDoc._id });
            if (!mappingDoc) throw new Error('Mapping not found for the provided Serial No');

            imeiDoc = await WhiteList.findById(mappingDoc.imei);
            if (!imeiDoc) throw new Error('IMEI not found in WhiteList for the provided Serial No');
        } else if (req.body.deviceId) {
            // Find the corresponding Mapping document for Device ID
            const deviceIdDoc = await WhiteList.findOne({ id: req.body.deviceId, type: "DeviceID" });
            if (!deviceIdDoc) throw new Error('Device ID not found in WhiteList');

            const mappingDoc = await Mapping.findOne({ deviceId: deviceIdDoc._id });
            if (!mappingDoc) throw new Error('Mapping not found for the provided Device ID');

            imeiDoc = await WhiteList.findById(mappingDoc.imei);
            if (!imeiDoc) throw new Error('IMEI not found in WhiteList for the provided Device ID');
        }

        // Find the LifeCycle entry based on the IMEI ID
        const lifeCycle = await LifeCycle.findOne({ imei: imeiDoc._id });

        if (!lifeCycle) {
            return res.status(404).send({ error: 'LifeCycle entry not found' });
        }

        // Update the stage field if provided
        if (req.body.stage) {
            lifeCycle.stage = req.body.stage;
        }

        await lifeCycle.save();
        res.status(200).send(lifeCycle);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});
/**
 * @swagger
 * /lifecycle/{id}:
 *   delete:
 *     tags: [LifeCycle]
 *     summary: Delete a lifecycle entry by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint deletes a specific lifecycle entry identified by its unique ID. No request body is required for deletion.
 *     operationId: deleteLifeCycleById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the lifecycle entry to delete
 *         schema:
 *           type: string
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *     responses:
 *       '204':
 *         description: Lifecycle entry deleted successfully
 *       '400':
 *         description: Invalid request or bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Invalid request!"
 *       '404':
 *         description: Lifecycle entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Lifecycle entry not found"
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
 *     LifeCycle:
 *       type: object
 *       properties:
 *         imei:
 *           type: string
 *           description: The ID of the IMEI String associated with the lifecycle
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         stage:
 *           type: string
 *           description: The stage of the lifecycle
 *           enum:
 *             - Flash
 *             - ILQC
 *             - Giftbox
 *             - Carton
 *           example: "Flash"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the lifecycle entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the lifecycle entry was last updated
 */


// DELETE
lifecycleRouter.delete('/:id',isAuth, async (req, res) => {
    try {
        const lifeCycle = await LifeCycle.findByIdAndDelete(req.params.id);

        if (!lifeCycle) {
            return res.status(404).send();
        }

        res.status(200).send(lifeCycle);
    } catch (error) {
        res.status(500).send(error);
    }
});

export default lifecycleRouter;