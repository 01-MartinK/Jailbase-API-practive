const express = require('express');
const app = express();
const cors = require('cors');
const port = 6661;
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json');

const criminals = [
    { id: 1, name: 'Vin Diesel', crime: 'Speeding', img_link: 'henry.jpg', long_desc: 'Wanted for speeding countlesly in the fast and furious series.' },
    { id: 2, name: 'Henry', crime: 'Racism', img_link: 'vin-diesel.jpg', long_desc: 'Henry is a natural racist' },
    { id: 3, name: 'Jason Voorhees', crime: 'Murder', img_link: 'jason-voorhees.jpg', long_desc: "Jason Voorhees is a third-degree murderer. He's prime spot for killing is a camping site." },
]

app.use(cors())
app.use(express.json())

app.get('/criminals', (req, res) => {
    res.send(criminals)
})

app.get('/criminals/:id', (req, res) => {
    res.send(criminals[req.params.id - 1])
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, () => {
    console.log(`API up at: http://localhost:${port}`)
});