import mongoose from "mongoose";
const lifeCycleSchema=new mongoose.Schema(
    {
        imei:{type:mongoose.Schema.Types.ObjectId,ref:'WhiteList'},//imei-reference from WHL
        // if deviceID and SN, check mapping and using that mapping we will find imei and then post it
        stage:{ type: String , required: true,enum:["Flash","ILQC","Giftbox","Carton"] },
    },
    {
        timestamps:true,
    }
    
);

const LifeCycle = mongoose.model('LifeCycle', lifeCycleSchema);
export default LifeCycle;