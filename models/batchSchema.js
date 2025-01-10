import mongoose from "mongoose";
const batchSchema=new mongoose.Schema(
    {
        batchId:{type:String,unique:true},
        id_prefix:{type:String},
        batch_size:{type:Number},
        cartonSize: { type: Number},
        createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
    },
    {
        timestamps:true,
    }
    
);
const Batch = mongoose.model('Batch', batchSchema);
export default Batch;