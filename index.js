// prequsitions
const express = require('express');
const https = require("https");
const app = express();
const fs = require("fs");
const cors = require('cors');
const port = 6661;
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json');
const { dirname } = require('path');

// for logging events
const logger = require('./logger.js');

app.use(express.json());
app.use(express.static(__dirname + '/public'));

const serv = https.createServer({
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem")
    },
    app).listen(port, () => {
        console.log(`API up at: https://localhost:${port}`)
});

// template database with criminals
var criminals = [
    { id: 1, name: 'Vin Diesel', crime: 'Speeding', img_link: 'vin-diesel.jpg', dob: "1976-01-12", long_desc: 'Wanted for speeding countlesly in the fast and furious series.' },
    { id: 2, name: 'Henry', crime: 'Racism', img_link: 'henry.jpg', dob: "2004-02-18", long_desc: 'Henry is a natural racist' },
    { id: 3, name: 'Jason Voorhees', crime: 'Murder', img_link: 'jason-voorhees.jpg', dob: "1956-06-24", long_desc: "Jason Voorhees is a third-degree murderer. He's prime spot for killing is a camping site." },
];

// admin credentials
const credentials = [
    {id: 1, username: "admin", email: "admin@gmail.com", password: "qwerty", isAdmin: true, ip: ""}
    
]

// for checking server lag
function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  // sessions
let sessions = []

// websocket prisoner cells
let prisonerCells = []

// id check
for (let i = 0; i < 24; i++) {
    prisonerCells.push({id: i, prisoner: -1})
}

app.use(cors())
app.use(express.json())

// Get all the criminals
app.get('/criminals', (req, res) => {
    res.send(criminals)
    //console.log(criminals)
})

// Send criminal data to client
app.get('/criminals/:id', (req, res) => {
    res.send(criminals[req.params.id - 1])
});

// On admin check
app.get('/adminCheck', (req, res) => {
    res.send(sessions)
})

// get logs for logger
app.get('/logs', (req, res) => {
    let logsData = logger.getLogs()
    res.send(logsData)
});

// On login
app.post('/login', (req, res) => {
    const user = credentials.find((user) => user.username === req.body.username && user.password === req.body.password)
    if (req.body.username == user.username && req.body.password == user.password) {
        user.ip = req.body.ip
        let newSession = {
            id: sessions.length + 1,
            userId: user.id,
            isAdmin: user.isAdmin
        }

        logger.logEvent({user: user.username, eventMethod: "Login", eventData: [`username: ${user.username}`], ip: user.ip});
        sessions.push(newSession)
        res.status(201).send(
            {sessionId: sessions.length}
        )
    } else {
        logger.logEvent({eventMethod: "Error", eventData: ["Wrong Credentials", req.body], ip: user.ip})
        res.send({ error: "wrong credentials" })
    }
})

// On user logout
app.post('/logout', (req, res) => {
    sessions = sessions.filter((session) => session.id != req.body.sessionId);
    logger.logEvent({eventMethod: "Logout", eventData: req.body.sessionId.userId})

    res.send("correct")
    res.status(200).end()
})

// Use the swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.post('/criminals/delete', (req, res) => {
    var user = credentials.find((user) => req.body.sessionId.userId = user.id)
    console.log(req.body.crim_id)
    var crim_id = req.body.crim_id;
    var new_list = [];
    criminals.forEach(crim => {
        if (crim.id !== crim_id)
            new_list.push(crim)
        else
        logger.logEvent({user: user.username, eventMethod: "DeleteCriminal", eventData: `crim_id: ${crim.id} ${crim.name}`.replace(","," "), ip: user.ip})
        })
    criminals = new_list

    // reset all of their id's
    var i = 1
    criminals.forEach(crim => {
        crim.id = i
        i += 1
    })
    res.send("correct")
    io.emit('update_prisoner', criminals)
})

// On edit criminal
app.post('/editCriminal', (req, res) => {
    var user = credentials.find((user) => req.body.sessionId.userId = user.id)
    const old_criminal = criminals[req.body.index -1];
    let changes = ""

    let new_criminal = {};
    new_criminal.id = old_criminal.id
    new_criminal.name = req.body.name;
    new_criminal.crime = req.body.crime;
    new_criminal.img_link = criminals[req.body.index -1].img_link;
    new_criminal.dob = req.body.dob;
    new_criminal.long_desc = req.body.desc;

    criminals[req.body.index - 1] = new_criminal

    for(key in old_criminal) {
        if (key != "id")
            if (old_criminal[key] !== new_criminal[key]){
                changes += (`crim_id: ${new_criminal.id} - old ${key}: ${old_criminal[key]} new ${key}: ${new_criminal[key]}`)
            }
    }

    logger.logEvent({user: user.username, eventMethod: "EditCriminal", eventData: changes, ip: user.ip})

    res.send("correct")
    io.emit('update_prisoner', criminals)
})

app.get('/', (req, res) => {
    fs.readFile('./index.html', function (err, html) {
        if (err) {
            throw err;
        }
        res.setHeader('content-type', 'text/html');
        res.send(html)
    });

})

// On Criminal add
app.post('/criminals/add', (req, res) => {
    var user = credentials.find((user) => req.body.sessionId.userId = user.id)
    var criminal = { id: criminals.length + 1, name: req.body.name, crime: req.body.crime, img_link: 'placeholder-300x300.webp', dob: req.body.dob, long_desc: req.body.long_desc }
    criminals.push(criminal)

    logger.logEvent({user: user.username, eventMethod: "AddCriminal", eventData: [criminal.id, criminal.name], ip: user.ip})

    res.send("correct")
    io.emit('update_prisoner', criminals)
})

// websocket io
const io = require("socket.io")(serv, {cors: { origin: "*"}})

io.on('connection', socket => {
    console.log("A new client has connected");
    io.emit('update_cells', prisonerCells)

    // On criminal Delete
    socket.on('cell_changed', data => {

        //console.log( prisonerCells[data.cell_id] )
        if (prisonerCells[data.cell_id].prisoner == -1) {
            removeFromOtherCell(data.prisoner)
            prisonerCells[data.cell_id] = {id: data.cell_id, prisoner: data.prisoner};
        }
        else if (prisonerCells[data.cell_id].prisoner == data.prisoner)
            prisonerCells[data.cell_id] = {id: data.cell_id, prisoner: -1};
        //console.log( prisonerCells[data.cell_id])
        io.emit('update_cells', prisonerCells)
    })
})

// remove the current prisoner from other cells
function removeFromOtherCell(prisoner_id) {
    //console.log("find prisoner")
    //console.log(prisoner_id)
    prisonerCells.forEach(prisonerCell => {
        if (prisonerCell.prisoner == prisoner_id) {
            console.log("found prisoner")
            prisonerCell.prisoner = -1
        }
    })
}
