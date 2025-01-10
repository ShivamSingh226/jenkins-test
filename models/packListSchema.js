import mongoose from "mongoose";
const packListSchema=new mongoose.Schema(
    {
        pmap:{type:mongoose.Schema.Types.ObjectId, ref:'Mapping'},
        cartonID:{type:mongoose.Schema.Types.ObjectId,ref:'Carton'},
        createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
        shipmentDate:{type:Date,default:Date.now}
    },
    {
        timestamps:true,
    }
    
);


const PackList = mongoose.model('PackList', packListSchema);
export default PackList;