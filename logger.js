// imports
const date = require('date-and-time');
const fs = require('fs');
const { parse } = require("csv-parse");
let logs = [];

let loadedLogs = []

logs.push("time§user§eventMethod§eventData§ip");

// log events via function for easy acces
async function logEvent(event = {}) {
    var now = new Date();
    let b = date.format(now, 'YYYY/MM/DD HH:mm:ss');
    
    // variable setting
    event.date = b;

    var text = `${event.date}§${event.user}§${event.eventMethod}§${event.eventData}§${event.ip}`;

    logs.push(text);

    commitLogsToFile();
}

function getLogsFromFile() {
    let data = []
    fs.createReadStream("./log.csv")
    .pipe(parse({columns: true, delimiter: "§", from_line: 1}))
    .on("data", (row) => {
        data.push(row)
    })
    .on("error", function (error) {
        console.log(error.message);
    })
    .on("end", function () {
        loadedLogs = data
        //console.log(data)
    });
}

function getLogs() {
    getLogsFromFile()
    return loadedLogs;
}

// save the logs to a csv file
function commitLogsToFile() {
    const writeStream = fs.createWriteStream('./log.csv');
    logs.forEach(log => writeStream.write(`${log}\n`));
    writeStream.end();
}

module.exports = {logEvent, getLogs};

// {time, ip_address, isik, tüüp, väli}