const mongoose = require('mongoose');

// Define the Comment Schema
const commentSchema = new mongoose.Schema({
    trackingId: { type: String, required: true },
    comment: { type: String, required: true },
    rating: { type: Number, required: true },
    from: { 
        type: String, 
        required: true, 
        default: 'Hyderabad' // Default value for origin location
    },
    to: { type: String, required: true },   // Destination location
    name: { type: String, required: true }, // Name of the person submitting the comment
}, { timestamps: true }); // timestamps will give createdAt and updatedAt fields

// Create a model based on the schema
const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
