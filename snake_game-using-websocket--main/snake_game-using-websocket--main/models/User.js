const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    password: String,
    userId: String,
    score: Number
});

module.exports = mongoose.model('User', userSchema);
