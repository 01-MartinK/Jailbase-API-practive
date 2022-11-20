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

const vue = Vue.createApp({
    data() {
        return {
            criminals: [],
            logs: [],
            prisonerCells: [],
            admin: false,
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
        
        // admin check for admin rights
        this.users = await (await fetch('https://localhost:6661/adminCheck')).json();
        this.user = this.users.find((user) => user.id == this.sessionId)
        
        // check if user is admin
        if (this.user) {
            if (this.user.isAdmin == true) {
                document.querySelector("#loginBtn").style.display = "none";
                var cols = document.querySelectorAll('#adminButton');
                for (i = 0; i < cols.length; i++) {
                    cols[i].style.display = "block";
                }
            }
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
            await fetch("https://localhost:6661/login", requestOptions)
            .then(response => response.json())
            .then(data => {
                
                if (data.error)
                this.loginError = data.error;
                if (data.sessionId) {
                    this.sessionId = data.sessionId;
                    localStorage.setItem('sessionId', this.sessionId);
                    if (data.isAdmin == true) {
                        this.admin = true
                    }
                    console.log(this.admin)
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
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    sessionId: Number(this.sessionId)
                })
            };
            await fetch("https://localhost:6661/logout", requestOptions)
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
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name_value,
                    crime: crime_value,
                    dob: dob_value,
                    img_link: "placeholder-300x300.webp",
                    long_desc: desc_value,
                    sessionId: this.sessionId
                })
            }
            
            await fetch("https://localhost:6661/criminals/add", request)
            .then(() => {
                window.location.reload();
            })
        },
        getLogs: async function() { // get logs from server
            const requestOptions = {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
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
            console.log(id - 1)
            document.querySelector("#detCrimName").textContent = this.criminals[id - 1].name
            document.querySelector("#detCrimCrime").textContent = "Crimes commited: " + this.criminals[id - 1].crime
            document.querySelector("#detCrimDob").textContent = ".  " + this.criminals[id - 1].dob
            document.querySelector("#detCrimDesc").textContent = this.criminals[id - 1].long_desc
            document.querySelector("#detCrimId").textContent = id
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
            await fetch("https://localhost:6661/editCriminal", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                index: this.index,
                name: crimName,
                crime: crimCrime,
                dob: crimDob,
                desc: crimDesc,
                sessionId: this.sessionId
            })
        }).then(() => {
            window.location.reload();
        })
    },
    CellSelected: async function(cell) { // set criminal to cell
        var cell_id = parseInt(cell.currentTarget.id)
        console.log(cell_id)
        this.socket.emit('cell_changed', {cell_id: cell_id-1, prisoner: this.index - 1})
    },
    deleteCriminal: async function(id) { // delete a criminal via it's id
        console.log(this.index)
        await fetch("https://localhost:6661/criminals/delete", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            crim_id: this.index,
            sessionId: this.sessionId
        })
    }).then(() => {
        window.location.reload();
    })
    
}
}
}).mount('#app')