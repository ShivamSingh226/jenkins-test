import mongoose from "mongoose";
const cartonIDSchema=new mongoose.Schema(
    {
        cartonId:{type:String},
        cartonSize: { type: Number , required: true},
        batch_id:{type:mongoose.Schema.Types.ObjectId,ref:'Batch'},
        createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
    },
    {
        timestamps:true,
    }
    
);

const Carton = mongoose.model('Carton', cartonIDSchema);
export default Carton;