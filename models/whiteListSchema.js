import mongoose from "mongoose";
// import Batch from "./batchSchema.js"
// import Carton from "./cartonIDSchema.js";
const whiteListSchema=new mongoose.Schema(
    {
        id:{type:String,unique:true},
        id_prefix:{type:String},
        type: { type: String ,enum:["IMEI","SN","DeviceID"] },
       
        createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
    },
    {
        timestamps:true,
    }
    
);
// Middleware to extract Batch ID and Carton ID
// whiteListSchema.pre('save', async function (next) {
//     if (this.type === 'SN' && this.id.length === 16) {
//         const serialNumber = this.id;
//         console.log(`Serial Number: ${serialNumber}`); // Log the serial number
        
//         const batchIdString = serialNumber.slice(0, -5);
//         console.log(`Parsed Batch ID: ${batchIdString}`); // Log the parsed Batch ID
        
//         const cartonIdString = serialNumber.slice(-5);
//         const cartonId = parseInt(cartonIdString, 10);
//         console.log(`Parsed Carton ID: ${cartonId}`);
        
//         if (cartonId < 1 || cartonId > 10000) {
//             return next(new Error('Carton ID must be between 1 and 10,000.'));
//         }

//         const existingCarton = await Carton.findOne({ cartonId: cartonIdString });// Also match cartonId and batchId
//         if (existingCarton) {
//             return next(new Error(`Carton ID ${cartonIdString} already exists. Request cannot be processed.`));
//         }

//         let batch = await Batch.findOne({ batchId: batchIdString });
//         if (!batch) {
//             batch = new Batch({
//                 batchId: batchIdString,
//                 quantity: 1,
//                 createdBy: this.createdBy
//             });
//             await batch.save();
//         } else {
//             batch.quantity += 1;
//             await batch.save();
//         }

//         const cartonEntry = new Carton({
//             cartonId: cartonIdString,
//             batchId: batch._id,
//             createdBy: this.createdBy
//         });

//         try {
//             await cartonEntry.save();
//             console.log(`Carton entry created: ${cartonEntry}`);
//         } catch (error) {
//             console.error('Error saving carton entry:', error);
//             return next(new Error('Failed to save carton entry.'));
//         }

//         this.batchId = batch._id;
//     }
//     next();
// });



const WhiteList = mongoose.model('WhiteList', whiteListSchema);
export default WhiteList;
// Carton, Batch, DeviceID ,IMEI, len(SN)==16 in bulk, 
// 10,000 Cartons in one batch, SN=16, Batch Number-12 
//12000000000000
//12000000000001
//PPO5765-001,002