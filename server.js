var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;


const sqlite3 = require('sqlite3').verbose();


var clientParks = {};

app.use(express.static('public'));

app.get('/', function(request, response) {
    response.sendFile(__dirname + '/public/index.html');
});

function disconnectFromPark(client) {
    if (clientParks[client.id] == null) {
	return;
    }
    client.leave(clientParks[client.id]);
    clientParks[client.id] = null;
}

io.on('connection', function(client) {
    clientParks[client.id] = null;
    client.on('getPark', function(park) {
	disconnectFromPark(client);
	getPark(client, park);
    });

    client.on('requestSlot', function(park, court, timeSlot, name) {
	console.log(name);
	setSlot(client, park, court, timeSlot, name);
    });

    client.on('cancelSlot', function(park, timeSlot) {
    });

    client.on('disconnect', function() {
	disconnectFromPark(client);
    });
    
});

function addCourts(courts, row) {
    console.log(row.Court);
    if (courts[row.Court] == undefined) {
	courts.courts.push(row.Court);
	courts[row.Court] = {};
	courts[row.Court].times = [];
    }
    
    console.log(courts[row.Court]);
    
    if (courts[row.Court][row.Time + ""] == undefined) {
	courts[row.Court][row.Time + ""] = [];
	courts[row.Court].times.push(row.Time + "");
    }
    
    console.log(courts[row.Court]);
    
    courts[row.Court][row.Time + ""].push(row.Name);
}

function getPark(client, park) {
    let db = new sqlite3.Database('./test.db', sqlite3.OPEN_READWRITE, function(err) {
	if(err) {
	    console.error(err.message);
	    io.to(client.id).emit("getParkFailed");
	    return;
	}
	console.log("Connection created");
    });

    courts = {};

    courts.courts = [];

    

    db.serialize(function() {
	db.all("SELECT * FROM Parks WHERE Park=?", park, (err, rows) => {
	    if (err) {
		throw err;
	    }
	    rows.forEach(function(row) {
		addCourts(courts, row);
	    });
	    io.to(client.id).emit("slots", courts);
	    clientParks[client.id] = park;
	    client.join(park);
	});
    });

    db.close(function(err) {
	if (err != null) {
	    throw err;
	}
    });
}

function setSlot(client, park, court, time, name) {
    let db = new sqlite3.Database('./test.db', sqlite3.OPEN_READWRITE, function(err) {
	if(err) {
	    console.error(err.message);
	    io.to(client.id).emit("getParkFailed");
	    return;
	}
	console.log("Connection created");
    });
    
    db.each('SELECT COUNT(*) AS count FROM PARKS WHERE Park=? And Court=? And Time=?',
		park, court, time, function(err, row) {
		    if (err != null) {
			console.log(err);
			return;
                    }

         	    if (row.count >= 10) {
			io.to(client.id).emit("spotFilled");
			return;
	            }

		    addEntry(db, client, park, court, time, name)
		});
    db.close(function(err) {
	if (err != null) {
	    console.error(err);
	}
    });
}

function addEntry(db, client, park, court, time, name) {
    console.log(name);
    db.run("INSERT INTO Parks (Park, Court, Time, Name) VALUES (?, ?, ?, ?)",
	   park, court, time, name, function(err) {
	       if (err) {
		   io.to(client.id).emit("reservationFailed");
		   return;
	       }

	       io.to(client.id).emit("reservationSuccess", court, time, park);
	       client.broadcast.to(clientParks[client.id]).emit("playerJoined", park, court, time, name);
	       
    });
}

http.listen(port, function() {
    console.log('listening on *:' + port);
});
