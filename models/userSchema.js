import mongoose from "mongoose";
const userSchema=new mongoose.Schema(
    {
        name:{type:String},
        serial_No:{type:String},
        accessLevel: { type: String ,enum:["Admin","User"] },
        licenseKey:{
            filename:{type:String,required:true},
            contentType:{type:String,required:true},
            path: { type: String, required: true },
            size: { type: Number, required: true } 
            //fileId:{type:mongoose.Schema.Types.ObjectId}
        },
        licenseToken:{type:String,required:true}
    },
    {
        timestamps:true,
    }
    
);

const User = mongoose.model('User', userSchema);
export default User;