import express from 'express';
import multer from 'multer';
import User from '../models/userSchema.js'; // Adjust the path as necessary
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';

import { generateToken } from '../utils.js';
import { isAuth } from '../utils.js';
const userRouter = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'uploads');

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
// Configure multer for local storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Use the defined upload directory
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Rename the file to avoid conflicts
    }
});

// Create the multer instance
const upload = multer({ storage });
/**
 * @swagger
 * /users/create:
 *   post:
 *     tags: [Auth]
 *     summary: Create a new user
 *     description: This endpoint creates a new user with the provided details, including a license key file.
 *     operationId: createUser
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the user
 *                 example: "John Doe"
 *               serial_No:
 *                 type: string
 *                 description: Unique serial number for the user
 *                 example: "SN123456789"
 *               accessLevel:
 *                 type: string
 *                 description: Access level of the user
 *                 enum:
 *                   - Admin
 *                   - User
 *                 example: "Admin"
 *               licenseKey:
 *                 type: string
 *                 format: binary
 *                 description: The license key file to upload
 *               licenseToken:
 *                 type: string
 *                 description: Unique license token for the user
 *                 example: "TOKEN123456789"
 *             required:
 *               - name
 *               - serial_No
 *               - accessLevel
 *               - licenseKey
 *               - licenseToken
 *             additionalProperties: false
 *     responses:
 *       '201':
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
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
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the user.
 *         name:
 *           type: string
 *           description: The name of the user
 *         serial_No:
 *           type: string
 *           description: Unique serial number for the user
 *         accessLevel:
 *           type: string
 *           description: Access level of the user
 *           enum:
 *             - Admin
 *             - User
 *         licenseKey:
 *           type: object
 *           properties:
 *             filename:
 *               type: string
 *               description: The name of the license file
 *             contentType:
 *               type: string
 *               description: The MIME type of the file
 *             path:
 *               type: string
 *               description: The path where the file is stored
 *             size:
 *               type: number
 *               description: The size of the file in bytes
 *         licenseToken:
 *           type: string
 *           description: Unique license token for the user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the user was last updated
 */


// CREATE User with file upload
userRouter.post('/create', upload.single('licenseKey'), async (req, res) => {
    try {
        const userData = {
            name: req.body.name,
            serial_No: req.body.serial_No,
            accessLevel: req.body.accessLevel,
            licenseKey: {
                filename: req.file.originalname,
                contentType: req.file.mimetype,
                path: req.file.path, // Local path to the file
                size: req.file.size
            },
            licenseToken: req.body.licenseToken
        };
      
        const user = new User(userData);
        await user.save();
        const token = generateToken(user);
        res.status(201).send({user,token});
    } catch (error) {
        res.status(400).send(error);
    }
});

/**
 * @swagger
 * /users/login:
 *   post:
 *     tags: [Auth]
 *     summary: User login
 *     description: This endpoint allows a user to log in using their unique serial number.
 *     operationId: loginUser
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serial_No:
 *                 type: string
 *                 description: Unique serial number for the user
 *                 example: "SN123456789"
 *             required:
 *               - serial_No
 *             additionalProperties: false
 *     responses:
 *       '200':
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: The name of the user
 *                     serial_No:
 *                       type: string
 *                       description: Unique serial number for the user
 *                     accessLevel:
 *                       type: string
 *                       description: Access level of the user
 *                       enum:
 *                         - Admin
 *                         - User
 *                 token:
 *                   type: string
 *                   description: JWT token for the user
 *                   example: "Bearer TOKEN123456789"
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *                   example: "User not found"
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

userRouter.post('/login', async (req, res) => {
    const { serial_No } = req.body;

    try {
        // Find the user by serial_No
        const user = await User.findOne({ serial_No });

        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        // Generate token for the found user
        const token = generateToken(user);

        // Send response with user data and token
        res.status(200).send({ user: { name: user.name, serial_No: user.serial_No, accessLevel: user.accessLevel }, token });
    } catch (error) {
        res.status(500).send({ message: 'Server error', error });
    }
});
/**
 * @swagger
 * /users/all:
 *   get:
 *     tags: [User]
 *     summary: Retrieve all users
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint retrieves a list of all users from the database.
 *     operationId: getAllUsers
 *     responses:
 *       '200':
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
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
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the user.
 *         name:
 *           type: string
 *           description: The name of the user
 *         serial_No:
 *           type: string
 *           description: Unique serial number for the user
 *         accessLevel:
 *           type: string
 *           description: Access level of the user
 *           enum:
 *             - Admin
 *             - User
 *         licenseKey:
 *           type: object
 *           properties:
 *             filename:
 *               type: string
 *               description: The name of the license file
 *             contentType:
 *               type: string
 *               description: The MIME type of the file
 *             path:
 *               type: string
 *               description: The path where the file is stored
 *             size:
 *               type: number
 *               description: The size of the file in bytes
 *         licenseToken:
 *           type: string
 *           description: Unique license token for the user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the user was last updated
 */

// READ all Users
userRouter.get('/all',isAuth, async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).send(users);
    } catch (error) {
        res.status(500).send(error);
    }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [User]
 *     summary: Retrieve a user by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint retrieves a user from the database using their unique ID.
 *     operationId: getUserById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the user
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "User not found"
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
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the user.
 *         name:
 *           type: string
 *           description: The name of the user
 *         serial_No:
 *           type: string
 *           description: Unique serial number for the user
 *         accessLevel:
 *           type: string
 *           description: Access level of the user
 *           enum:
 *             - Admin
 *             - User
 *         licenseKey:
 *           type: object
 *           properties:
 *             filename:
 *               type: string
 *               description: The name of the license file
 *             contentType:
 *               type: string
 *               description: The MIME type of the file
 *             path:
 *               type: string
 *               description: The path where the file is stored
 *             size:
 *               type: number
 *               description: The size of the file in bytes
 *         licenseToken:
 *           type: string
 *           description: Unique license token for the user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the user was last updated
 */

// READ a single User by ID
userRouter.get('/:id',isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send();
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});
/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     tags: [User]
 *     summary: Update a user by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint updates the details of a user identified by their unique ID. It allows for updating user information and uploading a new license key file.
 *     operationId: updateUserById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the user
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the user
 *                 example: "John Doe"
 *               serial_No:
 *                 type: string
 *                 description: Unique serial number for the user
 *                 example: "SN123456789"
 *               accessLevel:
 *                 type: string
 *                 description: Access level of the user
 *                 enum:
 *                   - Admin
 *                   - User
 *                 example: "User"
 *               licenseKey:
 *                 type: string
 *                 format: binary
 *                 description: The new license key file to upload (optional)
 *               licenseToken:
 *                 type: string
 *                 description: Unique license token for the user
 *                 example: "TOKEN123456789"
 *             additionalProperties: false
 *     responses:
 *       '200':
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '400':
 *         description: Invalid updates or request data
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
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "User not found"
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
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the user.
 *         name:
 *           type: string
 *           description: The name of the user
 *         serial_No:
 *           type: string
 *           description: Unique serial number for the user
 *         accessLevel:
 *           type: string
 *           description: Access level of the user
 *           enum:
 *             - Admin
 *             - User
 *         licenseKey:
 *           type: object
 *           properties:
 *             filename:
 *               type: string
 *               description: The name of the license file
 *             contentType:
 *               type: string
 *               description: The MIME type of the file
 *             path:
 *               type: string
 *               description: The path where the file is stored
 *             size:
 *               type: number
 *               description: The size of the file in bytes
 *         licenseToken:
 *           type: string
 *           description: Unique license token for the user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the user was last updated
 */

// UPDATE User
userRouter.patch('/:id',isAuth, upload.single('licenseKey'), async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'serial_No', 'accessLevel', 'licenseToken'];
    if (req.file) {
        allowedUpdates.push('licenseKey'); // Allow updating licenseKey if a new file is uploaded
    }
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send();
        }

        // Update fields
        updates.forEach((update) => {
            if (update === 'licenseKey' && req.file) {
                user.licenseKey = {
                    filename: req.file.originalname,
                    contentType: req.file.mimetype,
                    path: req.file.path,
                    size: req.file.size
                };
            } else {
                user[update] = req.body[update];
            }
        });

        await user.save();
        res.status(200).send(user);
    } catch (error) {
        res.status(400).send(error);
    }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [User]
 *     summary: Delete a user by ID
 *     security:
 *        - bearerAuth: []
 *     description: This endpoint deletes a user from the database using their unique ID.
 *     operationId: deleteUserById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the user
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The unique identifier of the deleted user.
 *                 message:
 *                   type: string
 *                   example: "User deleted successfully"
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "User not found"
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

// DELETE User
userRouter.delete('/:id',isAuth, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).send();
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

export default userRouter;
