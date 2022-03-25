const express = require('express');
const app = express();
const cors = require('cors');
const port = 6661;
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json');

var criminals = [
    { id: 1, name: 'Vin Diesel', crime: 'Speeding', img_link: 'vin-diesel.jpg', dob: "1976-01-12", long_desc: 'Wanted for speeding countlesly in the fast and furious series.' },
    { id: 2, name: 'Henry', crime: 'Racism', img_link: 'henry.jpg', dob: "2004-02-18", long_desc: 'Henry is a natural racist' },
    { id: 3, name: 'Jason Voorhees', crime: 'Murder', img_link: 'jason-voorhees.jpg', dob: "1956-06-24", long_desc: "Jason Voorhees is a third-degree murderer. He's prime spot for killing is a camping site." },
]

const credentials = {
    username: "admin",
    password: "qwerty"
}

var adminIn = true

app.use(cors())
app.use(express.json())

app.get('/criminals', (req, res) => {
    res.send(criminals)
})

app.get('/criminals/:id', (req, res) => {
    res.send(criminals[req.params.id - 1])
});

app.get('/adminCheck', (req, res) => {
    res.send(adminIn)
})

app.post('/criminals/add', (req, res) => {
    var criminal = { id: criminals.length + 1, name: req.body.name, crime: req.body.crime, img_link: 'placeholder-300x300.webp', dob: req.body.dob, long_desc: req.body.description }
    criminals.push(criminal)
})

app.post('/criminals/delete', (req, res) => {
    console.log(req.body.crim_id)
    var crim_id = req.body.crim_id;
    var new_list = [];
    criminals.forEach(crim => {
        if (crim.id !== crim_id)
            new_list.push(crim)
    })
    criminals = new_list

    // reset all of their id's
    var i = 1
    criminals.forEach(crim => {
        crim.id = i
        i += 1
    })
})

app.post('/login', (req, res) => {
    console.log(req.body)
    if (req.body.username == credentials.username && req.body.password == credentials.password) {
        adminIn = true
        res.send("true")
    } else
        res.send({ error: "wrong credentials" })
})

app.post('/editCriminal', (req, res) => {
    criminals[req.body.index - 1].name = req.body.name
    criminals[req.body.index - 1].crime = req.body.crime
    criminals[req.body.index - 1].dob = req.body.dob
    criminals[req.body.index - 1].long_desc = req.body.desc
})

app.post('/logout', (req, res) => {
    adminIn = false
})

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, () => {
    console.log(`API up at: http://localhost:${port}`)
});