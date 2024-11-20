let users = JSON.parse(localStorage.getItem('users')) || {};
    let currentUser = null;
    let events = JSON.parse(localStorage.getItem('events')) || Array.from({length: 6}, (_, i) => ({
        id: i + 1,
        registrant: null,
        pendingList: []
    }));
    let log = JSON.parse(localStorage.getItem('log')) || [];
    let registrationInProgress = false;

  
    function saveState() {
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('events', JSON.stringify(events));
        localStorage.setItem('log', JSON.stringify(log));
    }


    window.addEventListener('storage', () => {
        users = JSON.parse(localStorage.getItem('users')) || {};
        events = JSON.parse(localStorage.getItem('events')) || [];
        log = JSON.parse(localStorage.getItem('log')) || [];
        if (currentUser) loadDashboard(); 
    });

    function register() {
        const name = document.getElementById('name').value.trim();
        const regNumber = document.getElementById('regNumber').value.trim();
        
        if (!name || !regNumber) {
            alert("Please fill in all fields.");
            return;
        }

        if (users[regNumber]) {
            alert("User already exists. Please login.");
            return;
        }
        
        users[regNumber] = { name, regNumber, registeredEvents: 0 };
        currentUser = users[regNumber]; 
        saveState();  

        loadDashboard();
    }

    function login() {
        const regNumber = document.getElementById('regNumber').value.trim();
        
        if (!users[regNumber]) {
            alert("User not found. Please register first.");
            return;
        }
        currentUser = users[regNumber];
        loadDashboard();  
    }

    function loadDashboard() {
        document.getElementById('landing').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('greeting').textContent = `Hello, ${currentUser.name}! Choose your events.`;
        displayEvents();
        displayLog();
    }

    function displayEvents() {
        const eventList = document.getElementById('eventList');
        eventList.innerHTML = '';

        events.forEach(event => {
            const div = document.createElement('div');
            div.className = 'event';
            const status = document.createElement('span');

            if (event.registrant) {
                status.textContent = `Registered by: ${event.registrant.name}`;
                status.className = 'status confirmed';
            } else if (event.pendingList.some(p => p.regNumber === currentUser.regNumber)) {
                status.textContent = 'Pending...';
                status.className = 'status pending';
            } else {
                const registerButton = document.createElement('button');
                registerButton.textContent = 'Register';
                registerButton.onclick = () => attemptRegister(event.id);
                div.appendChild(registerButton);
            }

            div.prepend(`Event ${event.id}: `);
            div.appendChild(status);
            eventList.appendChild(div);
        });
    }

    function displayLog() {
        const logDiv = document.getElementById('log');
        logDiv.innerHTML = '';  

        log.forEach(entry => {
            const div = document.createElement('div');
            div.textContent = entry;
            logDiv.appendChild(div);
        });
    }

    function attemptRegister(eventId) {
        if (registrationInProgress) {
            alert("A registration process is currently ongoing. Please wait.");
            return;
        }

        const event = events.find(e => e.id === eventId);
        if (!event || event.registrant) return; 

        log.push(`${new Date().toLocaleTimeString()}: User ${currentUser.name} requested Event ${eventId}`);
        event.pendingList.push({ ...currentUser, timestamp: Date.now() }); 
        saveState();

        displayEvents();
        displayLog();

        registrationInProgress = true;
        setTimeout(() => {
            registrationInProgress = false;  
            finalizeRegistration(eventId);
        }, 30000); 
    }

    function finalizeRegistration(eventId) {
        const event = events.find(e => e.id === eventId);
        if (!event || event.registrant) return;  

       
        event.pendingList.sort((a, b) => {
            const userA = users[a.regNumber];
            const userB = users[b.regNumber];
            return userA.registeredEvents - userB.registeredEvents || a.timestamp - b.timestamp;
        });

        const selectedUser = event.pendingList.shift();  
        event.registrant = selectedUser; 
        users[selectedUser.regNumber].registeredEvents++; 
        log.push(`${new Date().toLocaleTimeString()}: ${selectedUser.name} confirmed for Event ${eventId}`);
        saveState();

        displayEvents();
        displayLog();

        reEvaluatePendingRegistrations();
    }

    function reEvaluatePendingRegistrations() {
        events.forEach(event => {
            if (!event.registrant && event.pendingList.length > 0) {
                event.pendingList.sort((a, b) => {
                    const userA = users[a.regNumber];
                    const userB = users[b.regNumber];
                    return userA.registeredEvents - userB.registeredEvents || a.timestamp - b.timestamp;
                });

                const selectedUser = event.pendingList.shift();
                if (selectedUser) {
                    event.registrant = selectedUser;
                    users[selectedUser.regNumber].registeredEvents++;
                    log.push(`${new Date().toLocaleTimeString()}: ${selectedUser.name} confirmed for Event ${event.id}`);
                }
            }
        });
        saveState();
        displayEvents();
        displayLog();
    }
