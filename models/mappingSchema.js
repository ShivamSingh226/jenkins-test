import mongoose from "mongoose";
const mappingSchema=new mongoose.Schema(
    {
        imei:{type:mongoose.Schema.Types.ObjectId,ref:'WhiteList'},
        serial_No: { type: mongoose.Schema.Types.ObjectId ,ref:'WhiteList'},
        deviceId:{type:mongoose.Schema.Types.ObjectId,ref:'WhiteList'},
        createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}
    },
    {
        timestamps:true,
    }
    
);

const Mapping = mongoose.model('Mapping', mappingSchema);
export default Mapping;