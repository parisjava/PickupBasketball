var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;


const sqlite3 = require('sqlite3').verbose();


var clientParks = {};

app.use(express.static('public'));

app.get('/', function(request, response) {
});

var disconnectFromPark(client) {
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

    client.on('requestSlot', function(park, court, timeSlot) {
	setSlot(client, park, timeSlot);
    });

    client.on('cancelSlot', function(park, timeSlot) {
    });

    client.on('disconnect', function() {
	disconnectFromPark(client);
    });
    
});

function getPark(client, park) {
    error = null;
    let db = new sqlite3.Database('./test.db', sqlite3.OPEN_READWRITE, function(error) {
	if(err) {
	    error = err;
	    console.error(err.message);
	    io.to(client.id).emit("getParkFailed");
	    return;
	}
	console.log("Connection created");
    });

    courts = {};

    db.serialize(function() {
	db.each("SELECT * FROM Parks WHERE park=" + park, (err, row) => {
	    if (err) {
		throw err;
	    }
	    if (courts[row.Court] == null) {
		courts[row.Court] = {};
	    }

	    if (courts[row.Court][row.Time] == null) {
		courts[row.Court][row.Time] = [];
	    }

	    courts[row.Court][row.Time].push(row.Name);
	});
    });

    db.close(function(err) {
	if (err != null) {
	    throw err;
	}
    });
    
    io.to(client.id).emit(courts);
    clientParks[client.id] = park;
    client.join(park);
}

function setSlot(client, park, court, time) {
    let db = new sqlite3.Database('./test.db', sqlite3.OPEN_READWRITE, function(error) {
	if(err) {
	    throw err;
	    console.error(err.message);
	    io.to(client.id).emit("getParkFailed");
	    return;
	}
	console.log("Connection created");
    });
    
    db.each('SELECT COUNT(*) AS count FROM PARKS WHERE Park=?, Court=?, Time=?',
		park, court, time, function(err, row) {
		    if (err != null) {
			throw err;
                    }

		    if (row.count == 10) {
			io.to(client.id).emit("spotFilled");
			return;
	            }

		    addEntry(db, client, park, court, time)
		});
    db.close(function(err) {
	throw err;
    });
}

function addEntry(db, client, park, court, time, name) {
    db.run("INSERT INTO Parks (Park, Court, Time, Name) VALUES (?, ?, ?, ?)",
	   park, court, time, name, function(err) {
	       if (err) {
		   io.to(client.id).emit("reservationFailed");
		   return;
	       }

	       io.to(client.id).emit("reservationSuccess");
	       io.to(clientParks[client.id]).emit("playerJoined", court, time, name);
	       
    });
}

http.listen(port, function() {
    console.log('listening on *:' + port);
});
