import jwt,{ decode } from "jsonwebtoken"
import User from "./models/userSchema.js"
// import multer from "multer";
// import fs from 'fs';
// import path from "path";
export const generateToken=(user)=>{
    return jwt.sign({
        _id:user._id,
       
        serial_No:user.serial_No,
    },process.env.JWT_SECRET,{
        expiresIn:'30d',
    })

}
export const isAuth=(req,res,next)=>{
    const authorization=req.headers.authorization;
    if(authorization){
        const token=authorization.slice(7,authorization.length);
        jwt.verify(
            token,
            process.env.JWT_SECRET,
            (err,decode)=>{
                if(err){
                    res.status(401).send({message:'Invalid token'})
                }else{
                    req.user=decode;
                    next();
                }
            }
        )
    }else{
        res.status(401).send({message:'No token'});
    }
}
export const isAdmin = async(req, res, next) => {
    if(req.user){
        const user=await User.findById(req.user._id).populate('role');
        if(user && user.role.isAdmin){
            next();
        }else{
            res.status(403).send({message:"Admin token is not valid"});
        }
    }else{
        res.status(401).send({message:"No token"});
    }
};
// const storage = multer.diskStorage({
//     destination: './uploads/',
//     filename: (req, file, cb) => {
//       cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
//     }
//   });
// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 1000000 }, // Limit file size to 1MB
//     fileFilter: (req, file, cb) => {
//       checkFileType(file, cb);
//     }
//   }).array('attachments', 100);
// function checkFileType(file, cb) {
//     const filetypes = /jpeg|jpg|png|pdf/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);
  
//     if (mimetype && extname) {
//       return cb(null, true);
//     } else {
//       cb('Error: Images and PDFs Only!');
//     }
// }

// export default upload;