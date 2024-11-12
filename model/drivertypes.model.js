import mongoose from "mongoose";

const driverTypesSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true // Assuming 'id' is always required
    },
    name: {
        type: String,
        required: true // Assuming 'name' is always required
    },
    category_type:{
        type:String
    }
}, { collection: 'driver_type' }); // Explicitly specify the collection name

const DriverTypes = mongoose.model('DriverType', driverTypesSchema);

export default DriverTypes;