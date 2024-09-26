const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    gameId: String,
    clients: [{
        clientId: String,
        color: String,
        x: Number,
        y: Number,
        xdirection: Number,
        ydirection: Number
    }]
});

module.exports = mongoose.model('Game', gameSchema);
