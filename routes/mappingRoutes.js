import express from 'express';
import Mapping from '../models/mappingSchema.js';
import WhiteList from '../models/whiteListSchema.js'; // Adjust the path as necessary
import { isAuth } from '../utils.js';
const mappingRouter = express.Router();

/**
 * @swagger
 * /mapping/create:
 *   post:
 *     tags: [Mapping]
 *     summary: Create a new mapping entry
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint creates a new mapping entry with the provided details.
 *     operationId: createMapping
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imei:
 *                 type: string
 *                 description: The ID of the IMEI associated with the mapping
 *                 example: "60d5ec49f1b2c8b1a4e4e4e4"
 *               serial_No:
 *                 type: string
 *                 description: The serial number associated with the mapping
 *                 example: "60d5ec49f1b2c8b1a4e4e4e5"
 *               deviceId:
 *                 type: string
 *                 description: The ID of the device associated with the mapping
 *                 example: "60d5ec49f1b2c8b1a4e4e4e6"
 *               createdBy:
 *                 type: string
 *                 description: The ID of the user who created the mapping
 *                 example: "60d5ec49f1b2c8b1a4e4e4e7"
 *             required:
 *               - imei
 *               - serial_No
 *               - deviceId
 *               - createdBy
 *             additionalProperties: false
 *     responses:
 *       '201':
 *         description: Mapping entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mapping'
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
 *     Mapping:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the mapping entry.
 *         imei:
 *           type: string
 *           description: The ID of the IMEI associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         serial_No:
 *           type: string
 *           description: The serial number associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         deviceId:
 *           type: string
 *           description: The ID of the device associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e6"
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e7"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the mapping entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the mapping entry was last updated
 */

// CREATE
mappingRouter.post('/create', isAuth, async (req, res) => {
    try {
        const mappings = Array.isArray(req.body) ? req.body : [req.body];

        const mappingPromises = mappings.map(async (mappingData) => {
            console.log(mappingData);

            // Find the corresponding Object IDs for IMEI, Serial No, and Device ID
            const imeiDoc = await WhiteList.findOne({ id: mappingData.imei, type: "IMEI" });
            const serialNoDoc = await WhiteList.findOne({ id: mappingData.serial_No, type: "SN" });
            const deviceIdDoc = await WhiteList.findOne({ id: mappingData.deviceId, type: "DeviceID" });

            if (!imeiDoc || !serialNoDoc || !deviceIdDoc) {
                throw new Error('IMEI, Serial No, or Device ID not found in WhiteList');
            }

            // Check if any of the IMEI, SN, or DeviceID is already in the mapping
            const existingMapping = await Mapping.findOne({
                $or: [
                    { imei: imeiDoc._id },
                    { serial_No: serialNoDoc._id },
                    { deviceId: deviceIdDoc._id }
                ]
            }).populate('imei serial_No deviceId createdBy');

            if (existingMapping) {
                return existingMapping;
            }

            // Create a new mapping instance with the found Object IDs
            return new Mapping({
                imei: imeiDoc._id,
                serial_No: serialNoDoc._id,
                deviceId: deviceIdDoc._id,
                createdBy: req.user._id
            });
        });

        // Resolve all promises and save the mappings
        const mappingInstances = await Promise.all(mappingPromises);

        // Filter out existing mappings from new mappings
        const newMappings = mappingInstances.filter(mapping => !mapping._id);
        console.log("The new mappings which will be created:",newMappings);
        const savedMappings = await Mapping.insertMany(newMappings);

        // Combine existing and new mappings
        const allMappings = [...mappingInstances.filter(mapping => mapping._id), ...savedMappings];
        
        res.status(201).send(allMappings);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});


/**
 * @swagger
 * /mapping/available:
 *   get:
 *     tags: [Mapping]
 *     summary: Get the first available serial_No and deviceId
 *     security:
 *       - bearerAuth: []
 *     description: This endpoint retrieves the first available serial_No and deviceId that are not mapped.
 *     operationId: getAvailableMapping
 *     responses:
 *       '200':
 *         description: Successfully retrieved the available serial_No and deviceId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 serial_No:
 *                   type: string
 *                   description: The first available serial number
 *                   example: "SN000001"
 *                 deviceId:
 *                   type: string
 *                   description: The first available device ID
 *                   example: "60d5ec49f1b2c8b1a4e4e4e6"
 *       '404':
 *         description: No available serial_No or deviceId found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *                   example: "No available serial_No or deviceId found"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *                   example: "Internal server error"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AvailableMapping:
 *       type: object
 *       properties:
 *         serial_No:
 *           type: string
 *           description: The first available serial number
 *           example: "SN000001"
 *         deviceId:
 *           type: string
 *           description: The first available device ID
 *           example: "60d5ec49f1b2c8b1a4e4e4e6"
 */

mappingRouter.get('/available', isAuth, async (req, res) => {
    try {
        // Find all serial_No in the WhiteList collection and sort them in ascending order
        const whiteListSerialNos = await WhiteList.find({ type: "SN" }).sort({ id: 1 });

        // Find all mapped serial_No in the Mapping collection
        const mappedSerialNos = await Mapping.find().populate('serial_No', 'id');
        const mappedSerialNoIds = mappedSerialNos.map(mapping => mapping.serial_No.id);

        // Filter out the mapped serial_No
        const availableSerialNo = whiteListSerialNos.find(serialNo => !mappedSerialNoIds.includes(serialNo.id));

        // Find the first available deviceId in the WhiteList collection
        const whiteListDeviceIds = await WhiteList.find({ type: "DeviceID" });
        const mappedDeviceIds = await Mapping.find().populate('deviceId', 'id');
        const mappedDeviceIdIds = mappedDeviceIds.map(mapping => mapping.deviceId.id);
        const availableDeviceId = whiteListDeviceIds.find(deviceId => !mappedDeviceIdIds.includes(deviceId.id));

        if (!availableSerialNo || !availableDeviceId) {
            return res.status(404).send({ message: 'No available serial_No or deviceId found' });
        }

        res.status(200).send({
            serial_No: availableSerialNo ? availableSerialNo.id : null,
            deviceId: availableDeviceId ? availableDeviceId.id : null
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

/**
 * @swagger
 * /mapping/all:
 *   get:
 *     tags: [Mapping]
 *     summary: Retrieve all mapping entries
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint retrieves all mapping entries from the database, including populated fields for IMEI, serial number, device ID, and creator.
 *     operationId: getAllMappings
 *     responses:
 *       '200':
 *         description: Successfully retrieved all mapping entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mapping'
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
 *     Mapping:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the mapping entry.
 *         imei:
 *           type: string
 *           description: The ID of the IMEI associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         serial_No:
 *           type: string
 *           description: The serial number associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         deviceId:
 *           type: string
 *           description: The ID of the device associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e7"
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e6"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the mapping entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the mapping entry was last updated
 */
// READ

mappingRouter.get('/all',isAuth, async (req, res) => {
    try {
        const mappings = await Mapping.find().populate('imei serial_No deviceId createdBy');
        res.status(200).send(mappings);
    } catch (error) {
        res.status(500).send(error);
    }
});
/**
 * @swagger
 * /mapping/fetchmap:
 *   post:
 *     tags: [Mapping]
 *     summary: Fetch mapping based on ID and type
 *     security:
 *       - bearerAuth: []
 *     description: This endpoint retrieves mapping information based on the provided ID and type (SN, IMEI, or DeviceID).
 *     operationId: fetchMapping
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
 *         description: Successfully retrieved the mapping
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mapping:
 *                   type: object
 *                   description: The mapping object retrieved from the database.
 *                   $ref: '#/components/schemas/Mapping'
 *                 isMapping:
 *                   type: boolean
 *                   example: true
 *                   description: Indicates if the mapping was found.
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
 *         description: Mapping entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isMapping:
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
 *     Mapping:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the mapping entry.
 *         imei:
 *           type: string
 *           description: The ID of the IMEI associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         serial_No:
 *           type: string
 *           description: The serial number associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         deviceId:
 *           type: string
 *           description: The ID of the device associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e7"
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e6"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the mapping entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the mapping entry was last updated
 */
// Frontend fetching type: Id:
//Serial Number || IMEI || DeviceId- Object fetching from WhiteList, findOne(SN_ObjectID) then send object mapping true or false
mappingRouter.post('/fetchmap', isAuth, async (req, res) => {
    const { id, type } = req.body; // Extract id and type from the request body
    console.log('Received ID:', id, 'Type:', type);

    if (!id || !type) {
        return res.status(400).send({ error: 'ID and type are required' });
    }

    const trimmedId = String(id).trim();
    console.log('Searching for ID:', trimmedId);

    try {
        // Validate the ID against the WhiteList schema based on the type
        let whiteListEntry;
        if (type === 'SN') {
            whiteListEntry = await WhiteList.findOne({ id: trimmedId, type: 'SN' });
        } else if (type === 'IMEI') {
            whiteListEntry = await WhiteList.findOne({ id: trimmedId, type: 'IMEI' });
        } else if (type === 'DeviceID') {
            whiteListEntry = await WhiteList.findOne({ id: trimmedId, type: 'DeviceID' });
        } else {
            return res.status(400).send({ error: 'Invalid type provided' });
        }

        console.log('WhiteList Entry:', whiteListEntry);
        
        if (!whiteListEntry) {
            return res.status(404).send({error:`${trimmedId} is not present in the whiteList` });
        }

        // Fetch the mapping using either serial_No or imei
        const mapping = await Mapping.findOne({
            $or: [
                { serial_No: whiteListEntry._id },
                { imei: whiteListEntry._id },
                { deviceId:whiteListEntry._id}
            ]
        }).populate('imei serial_No deviceId createdBy');
        
        if (!mapping) {
            return res.status(404).send({error:`The mapping for ${trimmedId} is not present`});
        }

        // Return the mapping with isMapping set to true
        res.status(200).send({ mapping, isMapping: true });
    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).send({ error: 'Internal Server Error' });
    }
});
/**
 * @swagger
 * /mapping:
 *   patch:
 *     tags: [Mapping]
 *     summary: Update a mapping entry
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint updates a specific mapping entry identified by its IMEI, Serial No, or Device ID. Only allowed fields can be updated.
 *     operationId: updateMapping
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
 *               createdBy:
 *                 type: string
 *                 description: The ID of the user who created the mapping
 *                 example: "60d5ec49f1b2c8b1a4e4e4e6"
 *             required:
 *               - imei
 *               - serial_No
 *               - deviceId
 *             additionalProperties: false
 *     responses:
 *       '200':
 *         description: Mapping entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mapping'
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
 *         description: Mapping entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Mapping entry not found"
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
 *     Mapping:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the mapping entry.
 *         imei:
 *           type: string
 *           description: The ID of the IMEI associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         serial_No:
 *           type: string
 *           description: The ID of the serial number associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         deviceId:
 *           type: string
 *           description: The ID of the device associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e6"
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e7"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the mapping entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the mapping entry was last updated
 */

// UPDATE with PATCH
mappingRouter.patch('/', isAuth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['imei', 'serial_No', 'deviceId', 'createdBy'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    try {
        // Initialize variables to store the ObjectId values
        let imeiDoc, serialNoDoc, deviceIdDoc;

        // Find the corresponding WhiteList documents for each identifier
        if (req.body.imei) {
            imeiDoc = await WhiteList.findOne({ id: req.body.imei, type: "IMEI" });
            if (!imeiDoc) throw new Error('IMEI not found in WhiteList');
        }
        if (req.body.serial_No) {
            serialNoDoc = await WhiteList.findOne({ id: req.body.serial_No, type: "SN" });
            if (!serialNoDoc) throw new Error('Serial No not found in WhiteList');
        }
        if (req.body.deviceId) {
            deviceIdDoc = await WhiteList.findOne({ id: req.body.deviceId, type: "DeviceID" });
            if (!deviceIdDoc) throw new Error('Device ID not found in WhiteList');
        }

        // Construct the query to find the Mapping document
        const mappingQuery = {
            $or: [
                { imei: imeiDoc ? imeiDoc._id : undefined },
                { serial_No: serialNoDoc ? serialNoDoc._id : undefined },
                { deviceId: deviceIdDoc ? deviceIdDoc._id : undefined }
            ]
        };

        console.log('Query for Mapping:', mappingQuery);
        const mapping = await Mapping.findOne(mappingQuery);

        if (!mapping) {
            return res.status(404).send({ error: 'Mapping entry not found' });
        }

        console.log('Found Mapping:', mapping);

        // Update only the specified fields with the correct ObjectId values
        updates.forEach((update) => {
            if (update === 'imei' && imeiDoc) {
                mapping.imei = imeiDoc._id;
            } else if (update === 'serial_No' && serialNoDoc) {
                mapping.serial_No = serialNoDoc._id;
            } else if (update === 'deviceId' && deviceIdDoc) {
                mapping.deviceId = deviceIdDoc._id;
            } else if (allowedUpdates.includes(update)) {
                mapping[update] = req.body[update];
            }
        });

        await mapping.save();
        res.status(200).send(mapping);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});
/**
 * @swagger
 * /mapping/{id}:
 *   delete:
 *     tags: [Mapping]
 *     summary: Delete a mapping entry by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint deletes a specific mapping entry identified by its unique ID.
 *     operationId: deleteMappingById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the mapping entry to delete
 *         schema:
 *           type: string
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *     responses:
 *       '200':
 *         description: Successfully deleted the mapping entry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mapping'
 *       '404':
 *         description: Mapping entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Mapping entry not found"
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
 *     Mapping:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the mapping entry.
 *         imei:
 *           type: string
 *           description: The ID of the IMEI associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e4"
 *         serial_No:
 *           type: string
 *           description: The serial number associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         deviceId:
 *           type: string
 *           description: The ID of the device associated with the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e7"
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the mapping
 *           example: "60d5ec49f1b2c8b1a4e4e4e6"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the mapping entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the mapping entry was last updated
 */

// DELETE
mappingRouter.delete('/:id',isAuth, async (req, res) => {
    try {
        const mapping = await Mapping.findByIdAndDelete(req.params.id);

        if (!mapping) {
            return res.status(404).send();
        }

        res.status(200).send(mapping);
    } catch (error) {
        res.status(500).send(error);
    }
});

export default mappingRouter;