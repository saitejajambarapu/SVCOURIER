const mongoose = require("mongoose"); 
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
    Email: {
        type: String,
        required: true,  // Email is required
    },
});

// Apply the passportLocalMongoose plugin to the schema (before creating the model)
userSchema.plugin(passportLocalMongoose);

// Create the model with a name that makes sense, "User"
const User = mongoose.model("User", userSchema);

// Export the User model
module.exports = User;
