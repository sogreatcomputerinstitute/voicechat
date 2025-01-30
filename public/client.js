const socket = io();
const joinForm = document.getElementById('join-form');
const usernameInput = document.getElementById('username');
const videosContainer = document.getElementById('videos-container');
const usersContainer = document.getElementById('users-container');
const onlineUsersLabel = document.querySelector('#users-container p');
const fullscreenContainer = document.getElementById('fullscreen-container');
const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');

joinForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();

    if (username) {
        socket.emit('join', username);
        joinForm.style.display = 'none';

        // Get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                socket.emit('location', { username, latitude, longitude });
            }, (error) => {
                console.error('Error getting location:', error);
            });
        } else {
            console.error('Geolocation is not supported by this browser.');
        }
    }
});

socket.on('userJoined', (username) => {
    console.log(`${username} has joined the chat.`);
    createVideoElement(username);
});

socket.on('userLeft', (username) => {
    console.log(`${username} has left the chat.`);
    removeVideoElement(username);
});

socket.on('mediaStream', (stream, username) => {
    addStreamToVideoElement(stream, username);
});

socket.on('existingStream', (stream, username) => {
    addStreamToVideoElement(stream, username);
});

socket.on('updateUsers', (users) => {
    updateUserList(users);
});

socket.on('locationUpdate', (locations) => {
    // Update map with user locations if needed
});

socket.on('error', (error) => {
    console.error('Error Occurred:', error);
});

function createVideoElement(username) {
    const videoElement = document.createElement('video');
    videoElement.id = `video-${username}`;
    videoElement.autoplay = true;
    videoElement.addEventListener('click', () => {
        enterFullscreen(videoElement);
    });
    videosContainer.appendChild(videoElement);
}

function removeVideoElement(username) {
    const videoElement = document.getElementById(`video-${username}`);
    if (videoElement) {
        videosContainer.removeChild(videoElement);
    }
}

function addStreamToVideoElement(stream, username) {
    const videoElement = document.getElementById(`video-${username}`);
    if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play();
    } else {
        createVideoElement(username);
        const newVideoElement = document.getElementById(`video-${username}`);
        newVideoElement.srcObject = stream;
        newVideoElement.play();
    }
}

function updateUserList(users = {}) {
    usersContainer.innerHTML = '<p>Online Users</p>';
    const userCount = Object.keys(users).length;
    onlineUsersLabel.textContent = userCount > 0 ? `Online Users: ${userCount}` : 'No connected devices';

    for (const [id, username] of Object.entries(users)) {
        const userDiv = document.createElement('div');
        userDiv.className = 'user animate';

        const avatarImg = document.createElement('img');
        avatarImg.src = 'avatar.jpg';
        avatarImg.className = 'avatar';

        const usernameDiv = document.createElement('div');
        usernameDiv.textContent = username;

        userDiv.appendChild(avatarImg);
        userDiv.appendChild(usernameDiv);
        usersContainer.appendChild(userDiv);
    }
}

function enterFullscreen(videoElement) {
    fullscreenContainer.style.display = 'flex';
    const fullscreenVideo = document.createElement('video');
    fullscreenVideo.srcObject = videoElement.srcObject;
    fullscreenVideo.autoplay = true;
    fullscreenVideo.controls = true;
    fullscreenContainer.innerHTML = '';
    fullscreenContainer.appendChild(fullscreenVideo);
    fullscreenContainer.appendChild(exitFullscreenBtn);
}

exitFullscreenBtn.addEventListener('click', () => {
    fullscreenContainer.style.display = 'none';
});
