
var socket = io();

var courtArray = [];
var park = "Druid";
var name = "Anon";
function createButton(park, court, time) {
    console.log(name);
    var button = document.createElement("input");
    button.type = "button";
    button.value = "Click Here";
    button.onclick = function() {
	socket.emit("requestSlot", park, court, time, name); 
    }
    return button;
}
function generateRows(table) {
    for (var y = 1; y <= 6; y++) {
	var tr = document.createElement('tr');
	var td = document.createElement('td');
	td.appendChild(document.createTextNode((12 + y) % 12));
	tr.appendChild(td);
	for (var x = 1; x <= 10; x++) {
	    td = document.createElement('td');
	    var div = document.createElement('div');
	    var button = createButton(park,table.id, (12 + y) % 12);
	    var nameSlot = document.createElement('div')
	    nameSlot.appendChild(document.createTextNode("Name"));
	    nameSlot.id = "name:" + table.id + ":" + x + ":" + y;
	    nameSlot.style.display = "none";
	    div.appendChild(button);
	    div.appendChild(nameSlot);
	    console.log(nameSlot.id);
	    td.appendChild(div);
	    tr.appendChild(td);
	}
	table.appendChild(tr);
    }
}
function makeTable(court) {
    var table = document.createElement("table");
    var caption = document.createElement("caption");
    caption.innerHTML = court;
    table.appendChild(caption);
    table.id = court;
    var trHead = document.createElement('tr');
    var td = document.createElement('td');
    td.appendChild(document.createTextNode('Time Slot'));
    trHead.appendChild(td);
    for (var x = 1; x <= 10; x++) {
	td = document.createElement('td');
	td.appendChild(document.createTextNode("Slot " + x));
	trHead.appendChild(td);
    }
    table.appendChild(trHead);
    generateRows(table); 
    document.getElementById("tables").appendChild(table);
   
}

function setRow(court, time, slots) {
    var table = document.getElementById(court);
    var entries = table.getElementsByTagName("tr")[time].children;
    console.log(entries);
    for (var x = 0; x < slots.length; x++) {
	console.log(entries[x + 1].children[0].children[0]);
	entries[x + 1].children[0].children[0].style.display = 'none';
	entries[x + 1].children[0].children[1].style.display = 'block';
	entries[x + 1].children[0].children[1].innerHTML = slots[x];
    }
}
socket.on("slots", function(courts) {
    console.log(courts);
    courts.courts.forEach(function(court) {
	makeTable(court);
	courts[court].times.forEach(function(time) {
	    setRow(court, time, courts[court][time]); 
        });
	courtArray.push(court);
    });
});

socket.on("spotFilled", function() {
    console.log("Spot Filled");
});


function addMember(court, time, park, name) {
    var table = document.getElementById(court);
    var entries = table.getElementsByTagName("tr")[time].children;
    for (var x = 0; x < entries.length; x++) {
	if (entries[x + 1].children[0].children[0].style.display != 'none') {
	    entries[x + 1].children[0].children[0].style.display = 'none';
	    entries[x + 1].children[0].children[1].style.display = 'block';
	    entries[x + 1].children[0].children[1].innerHTML = name;
	    break;
	}
    }
}
socket.on("reservationSuccess", function(court, time, park) {
    addMember(court, time, park, name);
});

socket.on("playerJoined",function(park, court, time, name) {
    addMember(court, time, park, name);
});


function request(parkName) {
    var tables = document.getElementById("tables");
    while (tables.firstChild) {
	tables.removeChild(tables.firstChild);
    }
    park = parkName
    socket.emit("getPark", park);
}

function setName() {
    name = document.getElementById("nameField").value;
}
