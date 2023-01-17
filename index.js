// prequsitions
const express = require('express');
const https = require("https");
const app = express();
const fs = require("fs");
const cors = require('cors');
const port = 6661;
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json');
const {OAuth2Client} = require('google-auth-library');
const { dirname } = require('path');
const googleOAuth2Client = new OAuth2Client('912715567165-2afmr3fv7elcfu973991pq88ihbc8qdj.apps.googleusercontent.com');

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
    { id: 1, name: 'Vin Diesel', crime: 'Speeding', img_link: 'vin-diesel.jpg', dob: "1976-01-12", long_desc: 'Wanted for speeding countlessly in the fast and furious series.' },
    { id: 2, name: 'Henry', crime: 'Hate crimes', img_link: 'henry.jpg', dob: "2004-02-18", long_desc: 'Henry has commited multiple hate crimes' },
    { id: 3, name: 'Jason Voorhees', crime: 'Murder', img_link: 'jason-voorhees.jpg', dob: "1956-06-24", long_desc: "Jason Voorhees is a third-degree murderer. His prime spot for killing is a camping site." },
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

function createSession(uID, isA) {
    let newSession = {
        id: Math.round(Math.random() * 100000000),
        userID: uID,
        isAdmin: isA
    }
    sessions.push(newSession)
    return newSession
}

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
})

// Send criminal data to client
app.get('/criminals/:id', (req, res) => {
    if (typeof criminals[req.params.id - 1] === 'undefined') {
        return res.status(404).send({ error: "Criminal not found" })
    }
    res.send(criminals[req.params.id - 1])
});

// On admin check
app.get('/adminCheck', (req, res) => {
    res.send(sessions)
})

// get logs for logger
app.get('/logs', (req, res) => {
    if (!(credentials.find((user) => req.headers.authorization = user.id)).isAdmin) {
        return res.status(401).send({error: 'You are not logged in'})
    }
    let logsData = logger.getLogs()
    res.status(200).send(logsData)
});

// get data from google token
async function getDataFromGoogleJwt(token) {
    const ticket = await googleOAuth2Client.verifyIdToken({
        idToken: token,
        audience: '912715567165-2afmr3fv7elcfu973991pq88ihbc8qdj.apps.googleusercontent.com',
    });
    return ticket.getPayload();
}

// Google auth login
app.post('/Oauth2Login', async (req, res) => {
    try {
        // get data from google login
        const dataFromGoogleJwt = await getDataFromGoogleJwt(req.body.credential)
        console.log(dataFromGoogleJwt)
        let user = credentials.find((user) => user.email === dataFromGoogleJwt.email)
        if (!user) {
            user = {id: credentials.length+1, username: dataFromGoogleJwt.name, email: dataFromGoogleJwt.email, password: "", isAdmin: true, ip: dataFromGoogleJwt.nbf};
            credentials.push(user);
        }

        let newSession = createSession(user.id, user.isAdmin)

        sessions.push(newSession)

        res.status(201).send(
            {sessionId: newSession.id}
        )
        
    } catch (err) {
        return res.status(400).send({error: 'Login unsuccessful'});
    }
    ;
});

// On login
app.post('/sessions', (req, res) => {
    if (!req.body.username || !req.body.password){
        return res.status(400).send({error: "One or all params are missing"})
    }
    const user = credentials.find((user) => user.username === req.body.username && user.password === req.body.password)
    if (!user) {
        return res.status(401).send({ error: "Invalid username or password" })
    } else {
        user.ip = req.body.ip
        let newSession = createSession(user.id, user.isAdmin);
        console.log(newSession.id)
        logger.logEvent({user: user.username, eventMethod: "Login", eventData: [`username: ${user.username}`], ip: user.ip});
        res.status(201).send({sessionId: newSession.id})
    }
})

// On user logout
app.delete('/sessions', (req, res) => {
    sessions = sessions.filter((session) => session.id != req.body.sessionId);
    logger.logEvent({eventMethod: "Logout", eventData: req.body.sessionId.userId})
    res.status(204).end()
})

// Use the swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.delete('/criminals/:id', (req, res) => {
    var user = credentials.find((user) => req.headers.authorization = user.id)
    if (!user.isAdmin) {
        return res.status(401).send({error: 'You are not logged in'})
    }

    if ((Number.isInteger(req.params.id) && parseInt(req.params.id) > 0)) {
        return res.status(400).send({error: 'Invalid id'})
    }

    var user = credentials.find((user) => req.body.sessionId.userId = user.id)
    var crim_id = parseInt(req.params.id);
    let criminal = criminals.find((x) => x.id === crim_id);

    if (!criminal) {
        return res.status(404).send({error: 'Criminal not found'})
    }

    criminals = criminals.filter((criminal) => criminal.id !== crim_id)

    // reset all of their id's
    var i = 1
    criminals.forEach(crim => {
        crim.id = i
        i += 1
    })
    logger.logEvent({user: user.username, eventMethod: "DeleteCriminal", eventData: `crim_id: ${criminal.id} ${criminal.name}`.replace(","," "), ip: user.ip})
    res.status(204).send("Deleted successfully")
    io.emit('update_prisoner', criminals)
})

// On edit criminal
app.patch('/criminals/:id', (req, res) => {
    var user = credentials.find((user) => req.headers.authorization = user.id)
    if (!user.isAdmin) {
        return res.status(401).send({error: 'You are not logged in'})
    }

    if ((Number.isInteger(req.params.id) && parseInt(req.params.id) > 0)) {
        return res.status(400).send({error: 'Invalid id'})
    }

    const old_criminal = criminals[req.params.id - 1];

    if (!old_criminal) {
        return res.status(404).send({error: 'Criminal not found'})
    }

    if (!req.body.name || !req.body.crime || !req.body.dob || !req.body.desc) {
        return res.status(400).send({error: 'One or all params are empty'})
    }

    let changes = ""

    let new_criminal = {};
    new_criminal.id = old_criminal.id
    new_criminal.name = req.body.name;
    new_criminal.crime = req.body.crime;
    new_criminal.img_link = criminals[req.params.id -1].img_link;
    new_criminal.dob = req.body.dob;
    new_criminal.long_desc = req.body.desc;

    criminals[req.params.id - 1] = new_criminal;

    for(key in old_criminal) {
        if (key != "id")
            if (old_criminal[key] !== new_criminal[key]){
                changes += (`crim_id: ${new_criminal.id} - old ${key}: ${old_criminal[key]} new ${key}: ${new_criminal[key]}`)
            }
    };

    logger.logEvent({user: user.username, eventMethod: "EditCriminal", eventData: changes, ip: user.ip});

    res.status(201).send({message: "Criminal edited successfully"});
    io.emit('update_prisoner', criminals);
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
app.post('/criminals', (req, res) => {
    var user = credentials.find((user) => req.headers.authorization = user.id)
    if (!user.isAdmin) {
        return res.status(401).send({error: 'You are not logged in'})
    }

    if (!req.body.name || !req.body.crime || !req.body.dob || !req.body.long_desc) {
        return res.status(400).send({error: 'One or all params are missing'})
    }

    var criminal = { id: criminals.length + 1, name: req.body.name, crime: req.body.crime, img_link: 'placeholder-300x300.webp', dob: req.body.dob, long_desc: req.body.long_desc };
    criminals.push(criminal);

    logger.logEvent({user: user.username, eventMethod: "AddCriminal", eventData: [criminal.id, criminal.name], ip: user.ip});

    res.status(201).send({message: "Added successfully"});
    io.emit('update_prisoner', criminals);
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
