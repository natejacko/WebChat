$(document).ready(function() { 
    let id = null;

    // Parse browser cookies for the cookie "user"
    const cookieName = "user=";
    let cookies = decodeURIComponent(document.cookie).split(';');
    for(let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1);
        }
        // If found, set the ID to the value of this cookie
        if (cookie.indexOf(cookieName) === 0) {
            id = cookie.substring(cookieName.length, cookie.length);
        }
    }

    let socket = null;
    // If the ID was set via a cookie, send a query parameter with the requested ID to the socket on connect
    if (id !== null) {
        socket = io.connect('', { query: "user=" + id });
    }
    // Otherwise don't send query
    else {
        socket = io();
    }

    // If form is submit (chat message sent), bundle the message and send to server
    $("form").submit(function(e) {
        e.preventDefault();
        let msgContents = $("#m").val();
        let msg = { command: msgContents.startsWith("/"), contents: msgContents };
        socket.emit("chat message", msg);
        $("#m").val("");
        return false;
    });

    // When server sends client "user changed", update our user ID and update our cookie
    socket.on("user changed", function(userID) {
        id = userID;
        document.cookie = "user=" + id;
        $(".username").text(id);
    });

    // When server sends chat history
    socket.on("chat history", function(messageList) {
        // Loop through all messages
        for (let i = 0; i < messageList.length; i++) {
            // Create a new item in the message list
            let li = $("<li>");

            // Add the time stamp, user, and message contents
            let timestamp = $("<span>").text(messageList[i].timestamp);
            timestamp.addClass("msgTimestamp");
            li.append(timestamp);

            let user = $("<span>").text(messageList[i].user);
            user.addClass("msgUsername");
            user.css("color", "#" + messageList[i].color);
            li.append(user);

            li.append($("<br>"));

            let contents = $("<span>").text(messageList[i].contents);
            contents.addClass("msgContents");
            li.append(contents);

            // If this message was from us, bold the message
            if (messageList[i].user === id) {
                li.addClass("msgBold");
            }

            $(".messageList ul").append(li);
        }
        // After all messages parsed, scroll to the bottom of the list
        scrollToBottom(".messageList ul");
    });

    // When server sends a single chat message
    socket.on("chat message", function(msg) {
        // Create new item in the message list
        let li = $("<li>");

        // Add timestamp, user (if one exists), and message contents
        let timestamp = $("<span>").text(msg.timestamp);
        li.append(timestamp);

        let user = null;
        if (msg.user !== null) {
            user = $("<span>").text(msg.user);
            li.append(user);
        }

        if (msg.isMessage) {
            li.append($("<br>"));
        }

        let contents = $("<span>").text(msg.contents);
        li.append(contents);

        // If this was a message and not a notification, format nicely
        if (msg.isMessage) {
            timestamp.addClass("msgTimestamp");
            user.addClass("msgUsername");
            user.css("color", "#" + msg.color);
            contents.addClass("msgContents");

            // Bold the message if from us
            if (msg.user === id) {
                li.addClass("msgBold");
            }
        }
        // Otherwise, format message to be info text
        else {
            li.addClass("msgInfo");
        }

        $(".messageList ul").append(li);

        // Scroll to bottom of list
        scrollToBottom();
    });

    // When server sends a new list of users
    socket.on("users updated", function(connectedUsers) {
        // Remove all contents from the current user list
        $(".userList ul").empty();

        // Add each user to the user list
        for (const user of connectedUsers) {
            let li = $("<li>").text(user);
            $(".userList ul").append(li);
        }
    });
});

// Function used to scroll to the bottom of the message list
function scrollToBottom() {
    $(".messageList ul").scrollTop($(".messageList ul").height());
}