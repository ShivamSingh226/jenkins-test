import express from 'express';
import WhiteList from '../models/whiteListSchema.js'; // Adjust the path as necessary
import { isAuth } from '../utils.js';
import logger from '../logger.js';
const whiteListRouter = express.Router();


/**
 * @swagger
 * /whitelist/create:
 *   post:
 *     tags: [WhiteList]
 *     summary: Create a new whitelist entry
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint creates a new whitelist entry with the provided details.
 *     operationId: createWhiteListEntry
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique identifier for the whitelist entry (optional for SN type)
 *                 example: "SN-000000000001"
 *               id_prefix:
 *                 type: string
 *                 description: Prefix for the identifier, required for SN type (must be 6 characters)
 *                 example: "SN-1234"
 *               type:
 *                 type: string
 *                 description: The type of the whitelist entry
 *                 enum:
 *                   - IMEI
 *                   - SN
 *                   - DeviceID
 *                 example: "SN"
 *              
 *               createdBy:
 *                 type: string
 *                 description: The ID of the user who created the whitelist entry
 *                 example: "60d5ec49f1b2c8b1a4e4e4e5"
 *             required:
 *               - type
 *               - createdBy
 *               
 *               - id_prefix
 *             additionalProperties: false
 *     responses:
 *       '201':
 *         description: Whitelist entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WhiteList'
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
 *     WhiteList:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the whitelist entry.
 *         id:
 *           type: string
 *           description: Unique identifier for the whitelist entry
 *           example: "SN-000000000001"
 *         id_prefix:
 *           type: string
 *           description: Prefix for the identifier
 *           example: "SN-1234"
 *         type:
 *           type: string
 *           description: The type of the whitelist entry
 *           enum:
 *             - IMEI
 *             - SN
 *             - DeviceID
 *           example: "SN"
 *         
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the whitelist entry
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the whitelist entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the whitelist entry was last updated
 */


// CREATE WhiteList entry
whiteListRouter.post('/create', isAuth, async (req, res) => {
    try {
        const whiteListEntries = Array.isArray(req.body) ? req.body : [req.body];
        console.log("The array body is",whiteListEntries);        
        // Prepare an array to hold new entries
        const newEntries = [];

        for (const entry of whiteListEntries) {
            logger.info("ENtry type is ",{type:entry.type});
            if (entry.type === "SN") {
                // Find the existing entries for the given id_prefix
                const existingEntries = await WhiteList.find({
                    id_prefix: entry.id_prefix,
                    type: "SN"
                });

                // Determine the starting number for new SNs
                let startNumber = existingEntries.length > 0 ? existingEntries.length + 1 : 1;

                // Calculate the length of the numeric part
                const idPrefixLength = entry.id_prefix.length;
                const numericPartLength = 16 - idPrefixLength; // Ensure total length is 16

                // Create new SN entries based on the count
                for (let i = 0; i < entry.count; i++) {
                    const paddedNumber = String(startNumber + i).padStart(numericPartLength, '0'); // Pad with zeros
                    const newId = `${entry.id_prefix}${paddedNumber}`; 
                    if (newId.length !== 16) {
                        return res.status(400).send({ error: `Generated SN "${newId}" must be 16 characters long.` });
                    }// Concatenate without hyphen
                    newEntries.push({
                        id: newId, // Generated ID for SN
                        id_prefix: entry.id_prefix, // Keep id_prefix for SN
                        type: "SN",
                         // Incremental count based on existing entries
                        createdBy: req.user._id // Ensure createdBy is included
                    });
                }
            } else {
                const idsToCheck = entry.data.map(item => item.id);
                console.log("The provided entries for IMEI/DeviceIDs are:",idsToCheck);
                const existingEntries = await WhiteList.find({ id: { $in: idsToCheck }, type: entry.type });
                console.log("The entries which are present in whitelist:",existingEntries);

                const existingIds = existingEntries.map(item => item.id);
                console.log("The entries which exist as an ID(DeviceID/IMEI):",existingIds);
                const uniqueEntries = entry.data.filter(item => !existingIds.includes(item.id));
                console.log("The Entries IMEI/DeviceID which should be inserted",uniqueEntries);

                if (uniqueEntries.length === 0) {
                    return res.status(400).json({ error: `All provided ${entry.type} entries are duplicates.` });
                }
                if(entry.type=="IMEI"){
                    console.log("The entry is",entry);
                    
                    
                       for(let i=0;i<uniqueEntries.length;i++){
                            newEntries.push({
                                id: uniqueEntries[i].id,
                                type: uniqueEntries[i].type,
                                createdBy: req.user._id,
                                // Add any other required fields here
                            });
                        
                            console.log("New Entries", newEntries);
                        }
                    
                }else{
                  
                // For other types, push the entry with the provided id
                    for (let i = 0; i < uniqueEntries.length; i++) {
                        if(uniqueEntries[i].id.length<=13){
                            newEntries.push({
                                id:uniqueEntries[i].id,
                                type: uniqueEntries[i].type,
                                createdBy: req.user._id
                            });
                        }else{
                            return res.status(400).json({ error: `Bad Request: DeviceID ${uniqueEntries[i].id} exceeds 13 characters.` });
                        }
                        console.log("NEw Entries",newEntries);
                    }
                }
                
            }
        }

        // Insert all new entries into the database
        console.log("NEw Entries",newEntries);
        const savedEntries = await WhiteList.insertMany(newEntries);

        res.status(201).send(savedEntries);
    } catch (error) {
        res.status(400).send(error);
    }
});


/**
 * @swagger
 * /whitelist/all:
 *   get:
 *     tags: [WhiteList]
 *     summary: Retrieve all whitelist entries
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint retrieves all whitelist entries from the database, including populated fields for batch and creator.
 *     operationId: getAllWhiteListEntries
 *     responses:
 *       '200':
 *         description: Successfully retrieved all whitelist entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WhiteList'
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
 *     WhiteList:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the whitelist entry.
 *         id:
 *           type: string
 *           description: Unique identifier for the whitelist entry (optional for SN type)
 *           example: "SN-000000000001"
 *         id_prefix:
 *           type: string
 *           description: Prefix for the identifier, required for SN type (must be 6 characters)
 *           example: "SN-1234"
 *         type:
 *           type: string
 *           description: The type of the whitelist entry
 *           enum:
 *             - IMEI
 *             - SN
 *             - DeviceID
 *           example: "SN"
 *        
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the whitelist entry
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the whitelist entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the whitelist entry was last updated
 */


// READ all WhiteList entries
whiteListRouter.get('/all',isAuth, async (req, res) => {
    try {
        const whiteListEntries = await WhiteList.find().populate('createdBy');
        res.status(200).send(whiteListEntries);
    } catch (error) {
        res.status(500).send(error);
    }
});

/**
 * @swagger
 * /whitelist/{id}:
 *   get:
 *     tags: [WhiteList]
 *     summary: Retrieve a whitelist entry by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint retrieves a specific whitelist entry identified by its unique ID, including populated fields for batch and creator.
 *     operationId: getWhiteListEntryById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the whitelist entry to retrieve
 *         schema:
 *           type: string
 *           example: "SN-000000000001"
 *     responses:
 *       '200':
 *         description: Successfully retrieved the whitelist entry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WhiteList'
 *       '404':
 *         description: Whitelist entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Whitelist entry not found"
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
 *     WhiteList:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the whitelist entry.
 *         id:
 *           type: string
 *           description: Unique identifier for the whitelist entry (optional for SN type)
 *           example: "SN-000000000001"
 *         id_prefix:
 *           type: string
 *           description: Prefix for the identifier, required for SN type (must be 6 characters)
 *           example: "SN-1234"
 *         type:
 *           type: string
 *           description: The type of the whitelist entry
 *           enum:
 *             - IMEI
 *             - SN
 *             - DeviceID
 *           example: "SN"
 *       
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the whitelist entry
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the whitelist entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the whitelist entry was last updated
 */


// READ a single WhiteList entry by ID
whiteListRouter.get('/:id',isAuth, async (req, res) => {
    try {
        const whiteListEntry = await WhiteList.findById(req.params.id);
        if (!whiteListEntry) {
            return res.status(404).send();
        }
        res.status(200).send(whiteListEntry);
    } catch (error) {
        res.status(500).send(error);
    }
});

/**
 * @swagger
 * /whitelist/{id}:
 *   patch:
 *     tags: [WhiteList]
 *     summary: Update a whitelist entry by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint updates a specific whitelist entry identified by its unique ID. Only allowed fields can be updated.
 *     operationId: updateWhiteListEntryById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the whitelist entry to update
 *         schema:
 *           type: string
 *           example: "SN-000000000001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique identifier for the whitelist entry (optional for SN type)
 *                 example: "SN-000000000001"
 *               id_prefix:
 *                 type: string
 *                 description: Prefix for the identifier, required for SN type (must be 6 characters)
 *                 example: "SN-1234"
 *               type:
 *                 type: string
 *                 description: The type of the whitelist entry
 *                 enum:
 *                   - IMEI
 *                   - SN
 *                   - DeviceID
 *                 example: "SN"
 *               count:
 *                 type: number
 *                 description: The number of serial numbers created (incremental based on existing entries)
 *                 example: 55
 *               createdBy:
 *                 type: string
 *                 description: The ID of the user who created the whitelist entry
 *                 example: "60d5ec49f1b2c8b1a4e4e4e5"
 *             additionalProperties: false
 *     responses:
 *       '200':
 *         description: Whitelist entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WhiteList'
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
 *         description: Whitelist entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Whitelist entry not found"
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
 *     WhiteList:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the whitelist entry.
 *         id:
 *           type: string
 *           description: Unique identifier for the whitelist entry (optional for SN type)
 *           example: "SN-000000000001"
 *         id_prefix:
 *           type: string
 *           description: Prefix for the identifier, required for SN type (must be 6 characters)
 *           example: "SN-1234"
 *         type:
 *           type: string
 *           description: The type of the whitelist entry
 *           enum:
 *             - IMEI
 *             - SN
 *             - DeviceID
 *           example: "SN"
 *       
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the whitelist entry
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the whitelist entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the whitelist entry was last updated
 */


// UPDATE WhiteList entry
whiteListRouter.patch('/:id',isAuth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['Id', 'type', 'createdBy'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    try {
        const whiteListEntry = await WhiteList.findById(req.params.id);
        if (!whiteListEntry) {
            return res.status(404).send();
        }

        // Update only the specified fields
        updates.forEach((update) => (whiteListEntry[update] = req.body[update]));
        await whiteListEntry.save();
        res.status(200).send(whiteListEntry);
    } catch (error) {
        res.status(400).send(error);
    }
});

/**
 * @swagger
 * /whitelist/{id}:
 *   delete:
 *     tags: [WhiteList]
 *     summary: Delete a whitelist entry by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint deletes a specific whitelist entry identified by its unique ID.
 *     operationId: deleteWhiteListEntryById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the whitelist entry to delete
 *         schema:
 *           type: string
 *           example: "SN-000000000001"
 *     responses:
 *       '200':
 *         description: Successfully deleted the whitelist entry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WhiteList'
 *       '404':
 *         description: Whitelist entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Whitelist entry not found"
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
 *     WhiteList:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the whitelist entry.
 *         id:
 *           type: string
 *           description: Unique identifier for the whitelist entry (optional for SN type)
 *           example: "SN-000000000001"
 *         id_prefix:
 *           type: string
 *           description: Prefix for the identifier, required for SN type (must be 6 characters)
 *           example: "SN-1234"
 *         type:
 *           type: string
 *           description: The type of the whitelist entry
 *           enum:
 *             - IMEI
 *             - SN
 *             - DeviceID
 *           example: "SN"
 *      
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created the whitelist entry
 *           example: "60d5ec49f1b2c8b1a4e4e4e5"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the whitelist entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the whitelist entry was last updated
 */


// DELETE WhiteList entry
whiteListRouter.delete('/:id',isAuth, async (req, res) => {
    try {
        const whiteListEntry = await WhiteList.findByIdAndDelete(req.params.id);
        if (!whiteListEntry) {
            return res.status(404).send();
        }
        res.status(200).send(whiteListEntry);
    } catch (error) {
        res.status(500).send(error);
    }
});

export default whiteListRouter;
