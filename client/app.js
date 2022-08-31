
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
                admin: false,
                index: 0,
                loginError: ""
            }
        },
        async created() {
            this.criminals = await (await fetch('http://localhost:6661/criminals')).json();
            // admin check for admin rights
            this.admin = await (await fetch('http://localhost:6661/adminCheck')).json();
            if (this.admin == true) {
                document.querySelector("#loginBtn").style.display = "none";
                var cols = document.querySelectorAll('#adminButton');
                for (i = 0; i < cols.length; i++) {
                    cols[i].style.display = "block";
                }
            }
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
                        if (data == true) {
                            window.location.reload()
                        }
                    });
            },
            logout: async function() {
                const requestOptions = {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                };
                await fetch("http://localhost:6661/logout", requestOptions)
                    .then(() => {
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
                document.querySelector("#detCrimCrime").textContent = "|" + this.criminals[id - 1].crime
                document.querySelector("#detCrimDob").textContent = "|" + this.criminals[id - 1].dob
                document.querySelector("#detCrimDesc").textContent = this.criminals[id - 1].long_desc
                document.querySelector("#detCrimId").textContent = id
            },
            edit: async function(id) {
                document.querySelector("#criminalNameUpdInput").value = this.criminals[this.index - 1].name
                document.querySelector("#crimeUpdInput").value = this.criminals[this.index - 1].crime
                document.querySelector("#dobUpdInput").value = this.criminals[this.index - 1].dob
                document.querySelector("#descriptionUpdInput").value = this.criminals[this.index - 1].long_desc
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