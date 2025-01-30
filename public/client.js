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

        // Check for available cameras and microphones
        navigator.mediaDevices.enumerateDevices()
            .then((devices) => {
                const hasCamera = devices.some(device => device.kind === 'videoinput');
                const hasMicrophone = devices.some(device => device.kind === 'audioinput');

                if (hasCamera && hasMicrophone) {
                    startMediaStream(username);
                    
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
                } else {
                    if (!hasCamera) alert('No camera detected.');
                    if (!hasMicrophone) alert('No microphone detected.');
                }
            })
            .catch((error) => {
                console.error('Error enumerating devices:', error);
            });
    }
});

function startMediaStream(username) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
            // Convert MediaStream to JSON before emitting
            const streamObj = streamToJSON(stream);
            socket.emit('mediaStream', streamObj);

            // Add the stream to the local video element
            addStreamToVideoElement(stream, username);
        })
        .catch((error) => {
            console.error('Error accessing media devices:', error);
        });
}

function streamToJSON(stream) {
    return {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map(track => ({
            id: track.id,
            kind: track.kind,
            label: track.label,
            enabled: track.enabled
        }))
    };
}

function jsonToStream(streamObj) {
    const stream = new MediaStream();
    
    // Enumerate devices to find the correct tracks
    navigator.mediaDevices.enumerateDevices().then(devices => {
        devices.forEach(device => {
            streamObj.tracks.forEach(trackObj => {
                if (device.kind === trackObj.kind && device.label === trackObj.label) {
                    navigator.mediaDevices.getUserMedia({
                        [trackObj.kind]: { deviceId: { exact: device.deviceId } }
                    }).then(deviceStream => {
                        const track = deviceStream.getTracks().find(t => t.kind === trackObj.kind);
                        if (track) {
                            stream.addTrack(track);
                            if (!stream.active) {
                                stream.active = true;
                            }
                        }
                    }).catch(error => {
                        console.error('Error accessing media devices:', error);
                    });
                }
            });
        });
    }).catch(error => {
        console.error('Error enumerating devices:', error);
    });

    return stream;
}

socket.on('userJoined', (username) => {
    console.log(`${username} has joined the chat.`);
    createVideoElement(username);
});

socket.on('userLeft', (username) => {
    console.log(`${username} has left the chat.`);
    removeVideoElement(username);
});

socket.on('mediaStream', (streamObj, username) => {
    // Reconstruct MediaStream from JSON object
    const stream = jsonToStream(streamObj);
    addStreamToVideoElement(stream, username);
});

socket.on('existingStream', (streamObj, username) => {
    // Reconstruct MediaStream from JSON object
    const stream = jsonToStream(streamObj);
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
    console.log('Received stream:', stream);
    console.log('Stream is instance of MediaStream:', stream instanceof MediaStream);

    const videoElement = document.getElementById(`video-${username}`);
    if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play().catch((error) => {
            console.error('Error playing video:', error);
        });
    } else {
        createVideoElement(username);
        const newVideoElement = document.getElementById(`video-${username}`);
        newVideoElement.srcObject = stream;
        newVideoElement.play().catch((error) => {
            console.error('Error playing video:', error);
        });
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
