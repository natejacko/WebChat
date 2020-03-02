// Starter code based off Socket.io chat tutorial https://socket.io/get-started/chat/
let express = require("express");
let app = express();
let http = require("http").createServer(app);
let io = require("socket.io")(http);

let port = 8080;

if (process.argv.length === 3) {
    port = process.argv[2];
}

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.use("/", express.static(__dirname + "/"));

// Set for unique connected users
let connectedUsers = new Set();

// Static counter to generate user IDs
let counter = {
    count: 1,
    get() {
        return this.count++;
    }
}

// Alphanumeric sort from here https://stackoverflow.com/questions/4340227/sort-mixed-alpha-numeric-array
const sortAlphaNum = (a, b) => a.localeCompare(b, 'en', { numeric: true })

// Message list and constant message limit
const MESSAGELIMIT = 200;
let messageList = [];

io.on("connection", function(socket) {
    let id = null;

    // Check if query parameter "user" was sent on socket connection
    if (socket.handshake.query.user) {
        let userCookie = socket.handshake.query.user;
        // If this id is in-use, give default user name
        if (connectedUsers.has(userCookie)) {
            id = "User" + counter.get();
        }
        // Otherwise use the requested user name
        else {
            id = userCookie;
        }
    }
    // If no parameter, give default user name
    else {
        id = "User" + counter.get();
    }

    // Update the client with their current user name
    socket.emit("user changed", id);
    
    // Send the list of connected users to all sockets (list is sorted alphanumerically)
    connectedUsers.add(id);
    io.emit("users updated", Array.from(connectedUsers).sort(sortAlphaNum));

    // Default chat color
    let color = "cde2ff";

    // Send this use the chat history before their joined message
    socket.emit("chat history", messageList);

    // Let everyone know a new user joined
    io.emit("chat message", createMessageObj(false, id, "joined"));

    socket.on("chat message", function(msg) {
        // Only parse messages with actual content
        if (msg.contents.length !== 0) {
            // Parse chat commands
            if (msg.command) {
                let msgString = null;

                let contents = msg.contents;
                // If /nickcolor, parse hexademical color string, and set color or notify if error
                if (contents.startsWith("/nickcolor ")) {
                    let arg = contents.substring(11);
                    let hex = /^[A-Fa-f0-9]{6}$/
                    if (hex.test(arg)) {
                        color = arg;
                        msgString = "Color set to: " + arg;
                    }
                    else {
                        msgString = "/nickcolor requires one hexadecimal argument. Usage /nickcolor RRGGBB";
                    }
                }
                // If /nickcolor with no argument, notify
                else if (contents === "/nickcolor") {
                    msgString = "/nickcolor requires one hexadecimal argument. Usage /nickcolor RRGGBB";
                }
                // If /nick, parse and set if not taken, otherwise notify if error
                else if (contents.startsWith("/nick ")) {
                    let arg = contents.substring(6);

                    if (connectedUsers.has(arg)) {
                        msgString = "Nickname " + arg + " is already taken";
                    }
                    else if (arg.length > 20) {
                        msgString = "Nickname " + arg + " is too long. Please create a nickname of 20 characters max";
                    }
                    else {
                        connectedUsers.delete(id);

                        id = arg;
                        socket.emit("user changed", id);
                        msgString = "Nickname set to: " + id;
    
                        connectedUsers.add(id);
                        io.emit("users updated", Array.from(connectedUsers).sort(sortAlphaNum));
                    }
                }
                // If nick with no argument, notify
                else if (contents === "/nick") {
                    msgString = "/nick requires one string argument. Usage /nick <new nickname>";
                }
                // If unrecognized command, notify
                else {
                    msgString = "Unrecognized command: " + msg.contents;
                }

                // Notify (only this) user of their command status
                socket.emit("chat message", createMessageObj(false, null, msgString));
            }
            // Otherwise parse normal chat message
            else {
                let message = createMessageObj(true, id, msg.contents, color);
                // Remove from front if over message limit
                if (messageList.length === MESSAGELIMIT) {
                    messageList.shift();
                }
                messageList.push(message);

                // Send all sockets the message
                io.emit("chat message", message);
            }
        }
    });

    socket.on("disconnect", function() {
        // Remove this user, and send the list of connected users to all sockets (list is sorted alphanumerically)
        connectedUsers.delete(id);
        io.emit("users updated", Array.from(connectedUsers).sort(sortAlphaNum));
        // Also send all user's a notification that the user left
        io.emit("chat message", createMessageObj(false, id, "left"));
    });
});

http.listen(port, function() {
    console.log("Listening on port " + port);
});

// Function to get the current time as HH:MM
function getTime() {
    let date = new Date();
    return date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0");
}

// Function to create a message object
function createMessageObj(isMsgFlag, userID, msgContent, userColor = null) {
    return { isMessage: isMsgFlag, timestamp: getTime(), user: userID, color: userColor, contents: msgContent }; 
}