const http = require("http");
const express = require("express");
const WebSocketServer = require("websocket").server;
const connectDB = require("./db");  // Import the MongoDB connection
const User = require('./models/User'); // Import the user model
const Game = require('./models/Game'); // Import the game model
const app = express();
const MAX_USERS = 4;

// Connect to MongoDB
connectDB();

// Frontend server on port 8080
app.get("/", (request, response) => {
    response.sendFile(__dirname + "/index.html");
});
app.listen(8080, () => console.log("Server is listening on port 8080"));

// Normal TCP server
const server = http.createServer((request, response) => {
    console.log("Connected");
});

// WebSocket Handshake
const wsServer = new WebSocketServer({
    "httpServer": server
});

// Client hashmap
let clients = {};
let games = {};

// When client sends a request
wsServer.on("request", request => {
    if (Object.keys(clients).length >= MAX_USERS) {
        request.reject(403, "Server Full");
        console.log("Rejected connection - max players reached");
        return;
    }
    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("Connection opened"));
    connection.on('error', err => console.error('WebSocket error:', err.message));

    // When receiving message from client 
    connection.on("message", async (message) => {
        const result = JSON.parse(message.utf8Data);
        // try{
        //     const game = new Game(cli)
        // }
        // User makes a connection
        if (result.method === "connect") {
            if (clients.hasOwnProperty(result.clientId)) {
                connection.close();
            }
            clients[result.clientId] = {
                "userId": result.clientId,
                "connection": connection
            };
            console.log(`Id from client is ${result.clientId}`);
        }

        // User creates a game
        if (result.method === "create") {
            const clientId = result.clientId;
            const gameId = guid();
            games[gameId] = {
                "gameId": gameId,
                "clients": []
            };

            const payLoad = {
                "method": "create",
                "game": games[gameId]
            };
            console.log("Game create request received");

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));

            // Save the new game to the database
            const newGame = new Game({ gameId, clients: [] });
            await newGame.save().then(() => console.log('Game created:', gameId))
                .catch(err => console.error('Error saving game:', err));
        }

        // User joins a game
        if (result.method === "join") {
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];
            const color = randomRGBA();

            game.clients.push({
                "clientId": clientId,
                "color": color,
                "x": randomXPosition(),
                "y": randomYPosition()
            });

            const payLoad = {
                "method": "join",
                "game": game
            };

            // Loop through all clients and tell them that people joined
            game.clients.forEach(client => {
                clients[client.clientId].connection.send(JSON.stringify(payLoad));
            });

            // Update the game in the database
            await Game.updateOne({ gameId }, { clients: game.clients })
                .then(() => console.log('Game updated with new client:', clientId))
                .catch(err => console.error('Error updating game:', err));
        }

        // User plays
        if (result.method === "play") {
            const gameId = result.gameId;
            const game = games[gameId];
            const clientToUpdate = game.clients.find(client => client.clientId === result.clientId);

            if (clientToUpdate) {
                clientToUpdate.x = result.x;
                clientToUpdate.y = result.y;
                clientToUpdate.xdirection = result.xdirection;
                clientToUpdate.ydirection = result.ydirection;
            }

            const payLoad = {
                "method": "update",
                "game": game
            };

            game.clients.forEach(client => {
                clients[client.clientId].connection.send(JSON.stringify(payLoad));
            });

            // Update the game in the database
            await Game.updateOne({ gameId }, { clients: game.clients })
                .then(() => console.log('Game updated with new positions'))
                .catch(err => console.error('Error updating game:', err));
        }

        // User registration
        if (result.method === "register") {
            const { name, password, userId, score } = result; // Assume these are sent from the client
            const newUser = new User({ name, password, userId, score });
            await newUser.save()
                .then(() => console.log('User registered:', userId))
                .catch(err => console.error('Error registering user:', err));
        }
    });

    connection.on("close", () => console.log("Closed"));
});

// Utility functions
const guid = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
};

function randomRGBA() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    const a = Math.random().toFixed(2);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function randomXPosition() {
    const numCols = 15;
    const randomCol = Math.floor(Math.random() * numCols);
    return randomCol * 25; // Each column is 25 pixels wide
}

function randomYPosition() {
    const numRows = 20;
    const randomRow = Math.floor(Math.random() * numRows);
    return randomRow * 25; // Each row is 25 pixels tall
}

// Start listening
server.listen(8081, () => console.log("WebSocket server is listening on port 8081"));
