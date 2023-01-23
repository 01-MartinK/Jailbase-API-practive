function show_criminalInsertPopup() {
    document.querySelector(".add-box").style.display = "block"
}

function hide_criminalInsertPopup() {
    document.querySelector(".add-box").style.display = "none"
}

function show_loginBox() {
    document.querySelector(".loginBox").style.display = "block"
}

function hide_loginBox() {
    document.querySelector(".loginBox").style.display = "none"
}

// on load window set google button and client id
window.onload = function () {
    google.accounts.id.initialize({
        client_id: '912715567165-2afmr3fv7elcfu973991pq88ihbc8qdj.apps.googleusercontent.com',
        callback: handleCredentialResponse
    });
    // Google prompt
    // google.accounts.id.prompt();

    google.accounts.id.renderButton(
        document.getElementById('signInDiv'),
        {
            theme: 'filled_blue',
            size: 'large',
            text: 'long',
            type: 'standard'
        }
    )
};

// handle googleOauth response
function handleCredentialResponse(response) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://localhost:6661/Oauth2Login');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
        // check if the response is valid
        if (xhr.status === 201) {
            let sessionId = JSON.parse(xhr.response).sessionId
            // parse the response and extract the sessionId and save it in a cookie
            localStorage.setItem("sessionId", sessionId);
            // hide signin button
            document.getElementById('signInDiv').style.display = 'none';
            vue.sessionId = sessionId;
            window.location.reload();
        } else {
            console.log('Request failed.  Returned status of ' + xhr.status + " " + xhr.statusText + " " + xhr.responseText);
        }
    };
    xhr.send(JSON.stringify(response));
}

const vue = Vue.createApp({
    data() {
        return {
            criminals: [],
            logs: [],
            prisonerCells: [],
            index: 0,
            loginError: "",
            sessionId: null,
            socket: null,
            ip: ""
        }
    },
    async created() {
        this.socket = io.connect("https://localhost:6661");

        // connect to server via websocket
        this.socket.on('connect', () => {
            //console.clear()
            console.log("connected to server");
        });

        // update cell data
        this.socket.on('update_cells', (cellData) => {
            prisonerCells = cellData;
            this.updateCells()
            //console.log(cellData);
        });

        this.getIp();

        // update prisoner data via websocket
        this.socket.on('update_prisoner', (prisonerData) => {
            this.criminals = prisonerData
            this.getById(this.index)
            this.saveToLocalStorage()
        })

        this.sessionId = localStorage.getItem('sessionId');

        var t = localStorage.getItem('Criminals');
        this.criminals = JSON.parse(t)

        try {
            this.criminals = await (await fetch('https://localhost:6661/criminals')).json();
            this.saveToLocalStorage()
        } catch(problem){
            console.log(problem)
        }
    },
    socket: {
        connect: () => {console.log("connected")}
    },
    methods: {
        login: async function() { // send data to server for login and check it's responce
            var username_value = document.querySelector("#usernameInput").value
            var password_value = document.querySelector("#passwordInput").value
            const requestOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username_value,
                    password: password_value,
                    ip: this.ip
                })
            };
            await fetch("https://localhost:6661/sessions", requestOptions)
            .then(response => response.json())
            .then(data => {
                
                if (data.error) {
                    this.loginError = data.error;
                }    
                if (data.sessionId) {
                    this.sessionId = data.sessionId;
                    localStorage.setItem('sessionId', this.sessionId);
                    window.location.reload();
                }
            });
        },
        getIp: async function() { // get current client ip
            await fetch('https://api.ipify.org?format=json')
            .then(x => x.json())
            .then(({ ip }) => {
                this.ip = ip.toString();
            });
        },
        logout: async function() { // logout method
            const requestOptions = {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": 'Bearer ' + this.sessionId
                }
            };
            await fetch("https://localhost:6661/sessions", requestOptions)
            .then(() => {
                this.sessionId = null;
                localStorage.clear();
                window.location.reload();
            })
        },
        addCriminal: async function() { // add criminals via values
            var name_value = document.querySelector("#criminalNameInput").value
            var crime_value = document.querySelector("#crimeInput").value
            var dob_value = document.querySelector("#dobInput").value
            var desc_value = document.querySelector("#descriptionInput").value
            
            const request = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": 'Bearer ' + this.sessionId
                },
                body: JSON.stringify({
                    name: name_value,
                    crime: crime_value,
                    dob: dob_value,
                    img_link: "placeholder-300x300.webp",
                    long_desc: desc_value
                })
            }
            
            await fetch("https://localhost:6661/criminals", request)
            .then(response => response.json())
            .then(data => {
                if (data.error){
                    alert(data.error);
                } else {
                    alert(data.message)
                    window.location.reload()
                }
            })
        },
        getLogs: async function() { // get logs from server
            const requestOptions = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": 'Bearer ' + this.sessionId
                }
            };
            await fetch("https://localhost:6661/logs", requestOptions)
            .then(response => response.json())
            .then(data => {
                this.logs = data;
            })
        },
        getById: async function(id) { // get criminal by id
            this.index = id
            if (this.criminals[id - 1]) {
                document.querySelector("#detCrimName").textContent = this.criminals[id - 1].name
                document.querySelector("#detCrimCrime").textContent = "Crimes commited: " + this.criminals[id - 1].crime
                document.querySelector("#detCrimDob").textContent = ".  " + this.criminals[id - 1].dob
                document.querySelector("#detCrimDesc").textContent = this.criminals[id - 1].long_desc
                document.querySelector("#detCrimId").textContent = id
            }    
        },
        updateCells: async function() { // update cells via websocket
            if (prisonerCells.length != 0) {
                prisonerCells.forEach(cell => {
                    if (cell.prisoner != -1) {
                        document.getElementById(`${cell.id+1}`).classList.add("selectedCell");
                        document.getElementById(`${cell.id+1}`).textContent = this.criminals[cell.prisoner].name
                    }
                    else if (cell.prisoner == -1) {
                        document.getElementById(`${cell.id+1}`).classList.remove("selectedCell");
                        document.getElementById(`${cell.id+1}`).textContent = "empty cell"
                }
                });
            }
        },
        edit: async function() { // initiali edit criminal and expand modal
            document.querySelector("#criminalNameUpdInput").value = this.criminals[this.index - 1].name
            document.querySelector("#crimeUpdInput").value = this.criminals[this.index - 1].crime
            document.querySelector("#dobUpdInput").value = this.criminals[this.index - 1].dob
            document.querySelector("#descriptionUpdInput").value = this.criminals[this.index - 1].long_desc
        },
        saveToLocalStorage: async function() { // save to local storage the current criminals
            localStorage.setItem('Criminals', JSON.stringify(this.criminals));
        },
        finalizeEdit: async function() { // finalize the edit and send data to server
            var crimName = document.querySelector("#criminalNameUpdInput").value
            var crimCrime = document.querySelector("#crimeUpdInput").value
            var crimDob = document.querySelector("#dobUpdInput").value
            var crimDesc = document.querySelector("#descriptionUpdInput").value
            await fetch("https://localhost:6661/criminals/" + this.index, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": 'Bearer ' + this.sessionId
            },
            body: JSON.stringify({
                name: crimName,
                crime: crimCrime,
                dob: crimDob,
                desc: crimDesc
            })
        }).then(response => response.json())
        .then(data => {
            if (data.error){
                alert(data.error);
            } else {
                console.log(this.sessionId)
                alert(data.message)
                window.location.reload()
            }
        })
    },
    CellSelected: async function(cell) { // set criminal to cell
        var cell_id = parseInt(cell.currentTarget.id)
        console.log(cell_id)
        this.socket.emit('cell_changed', {cell_id: cell_id-1, prisoner: this.index - 1})
    },
    deleteCriminal: async function(id) { // delete a criminal via it's id
        console.log(this.index)
        await fetch("https://localhost:6661/criminals/" + this.index, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": 'Bearer ' + this.sessionId
        }
    }).then(() => {
        window.location.reload();
    })
    
}
}
}).mount('#app')