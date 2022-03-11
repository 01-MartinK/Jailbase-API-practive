const express = require('express');
const app = express();
const cors = require('cors');
const port = 6661;
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json');

const criminals = [
    { id: 1, name: 'Vin Diesel', crime: 'Speeding' },
    { id: 1, name: 'Henry', crime: 'Racism' },
    { id: 1, name: 'Jason Voorhees', crime: 'Murder' },
]

app.use(cors())
app.use(express.json())

app.get('/criminals', (req, res) => {
    res.send(criminals)
})

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, () => {
    console.log(`API up at: http://localhost:${port}`)
});