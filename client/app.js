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
            prisonerCells: [],
            admin: false,
            index: 0,
            loginError: "",
            sessionId: null,
            socket: null
        }
    },
    async created() {
        this.socket = io.connect("http://localhost:6661");

        this.socket.on('connect', () => {
            //console.clear()
            console.log("connected to server");
        });

        this.socket.on('update_cells', (cellData) => {
            prisonerCells = cellData;
            this.updateCells()
            //console.log(cellData);
        });

        this.socket.on('update_prisoner', (prisonerData) => {
            this.criminals = prisonerData
            this.getById(this.index)
            this.saveToLocalStorage()
        })

        this.sessionId = localStorage.getItem('sessionId');

        var t = localStorage.getItem('Criminals');
        this.criminals = JSON.parse(t)

        try {
            this.criminals = await (await fetch('http://localhost:6661/criminals')).json();
            this.saveToLocalStorage()
        } catch(problem){
            console.log(problem)
        }
        
        // admin check for admin rights
        this.users = await (await fetch('http://localhost:6661/adminCheck')).json();
        this.user = this.users.find((user) => user.id == this.sessionId)
        
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
        login: async function() {
            var username_value = document.querySelector("#usernameInput").value
            var password_value = document.querySelector("#passwordInput").value
            const requestOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username_value,
                    password: password_value
                })
            };
            await fetch("http://localhost:6661/login", requestOptions)
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
        logout: async function() {
            const requestOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    sessionId: Number(this.sessionId)
                })
            };
            await fetch("http://localhost:6661/logout", requestOptions)
            .then(() => {
                this.sessionId = null;
                localStorage.clear();
                window.location.reload();
            })
        },
        addCriminal: async function() {
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
                })
            }
            
            await fetch("http://localhost:6661/criminals/add", request)
            .then(() => {
                window.location.reload();
            })
        },
        getById: async function(id) {
            this.index = id
            console.log(id - 1)
            document.querySelector("#detCrimName").textContent = this.criminals[id - 1].name
            document.querySelector("#detCrimCrime").textContent = "Crimes commited: " + this.criminals[id - 1].crime
            document.querySelector("#detCrimDob").textContent = ".  " + this.criminals[id - 1].dob
            document.querySelector("#detCrimDesc").textContent = this.criminals[id - 1].long_desc
            document.querySelector("#detCrimId").textContent = id
        },
        updateCells: async function() {
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
        edit: async function() {
            document.querySelector("#criminalNameUpdInput").value = this.criminals[this.index - 1].name
            document.querySelector("#crimeUpdInput").value = this.criminals[this.index - 1].crime
            document.querySelector("#dobUpdInput").value = this.criminals[this.index - 1].dob
            document.querySelector("#descriptionUpdInput").value = this.criminals[this.index - 1].long_desc
        },
        saveToLocalStorage: async function() {
            localStorage.setItem('Criminals', JSON.stringify(this.criminals));
        },
        finalizeEdit: async function() {
            
            var crimName = document.querySelector("#criminalNameUpdInput").value
            var crimCrime = document.querySelector("#crimeUpdInput").value
            var crimDob = document.querySelector("#dobUpdInput").value
            var crimDesc = document.querySelector("#descriptionUpdInput").value
            await fetch("http://localhost:6661/editCriminal", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                index: this.index,
                name: crimName,
                crime: crimCrime,
                dob: crimDob,
                desc: crimDesc
            })
        }).then(() => {
            window.location.reload();
        })
    },
    CellSelected: async function(cell) {
        var cell_id = parseInt(cell.currentTarget.id)
        console.log(cell_id)
        this.socket.emit('cell_changed', {cell_id: cell_id-1, prisoner: this.index - 1})
    },
    deleteCriminal: async function(id) {
        console.log(this.index)
        await fetch("http://localhost:6661/criminals/delete", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            crim_id: this.index,
        })
    }).then(() => {
        window.location.reload();
    })
    
}
}
}).mount('#app')