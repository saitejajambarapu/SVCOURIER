const mongoose = require("mongoose");  // Fix the typo here
const { type } = require("os");
const Schema = mongoose.Schema;  // Use 'mongoose' instead of 'mongooose'

const countrySchema = new Schema({
    title: {
        type: String,
        required: true,  // Title is required
    },
    image: {
        url: {
            type: String,  // Define the type for the URL
            required: true,  // URL is required
        },
    },
    price: {
        type: Number,
        required: true,  // Price is required
    },
    Docprice: {
        type: Number,
        required: true,  // Price is required
    },
    Days:{type:Number,required:true},
});

// Create the model with a name that makes sense, "CountryPrices"
const CountryPrices = mongoose.model("CountryPrices", countrySchema);  // Better naming convention

// Export the model to use it in other files
module.exports = CountryPrices;
