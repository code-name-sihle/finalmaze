//---------------------------------IMPORTS-----------------------------------------

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer, Clock } from 'three';

//--------------------------------INITIALISATION------------------------------------

// Initialize the Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);  // Append canvas to body

// Add lights to the scene
const light = new THREE.AmbientLight(0x404040, 3);  // Soft white light
scene.add(light);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Initialize variables
const clock = new Clock();
let character, mixer, walkAction, idleAction, maze, currentLevel = 1;

const keys = {
  w: false,
  a: false,
  s: false,
  d: false,

};

const exitButton = document.getElementById('exitButton');
if (exitButton) {
    exitButton.addEventListener('click', function() {
        window.location.href = 'index.html'; // Navigate to start page when Exit is clicked
    });
}

//------------------------------------MINIMAP------------------------------------------------

// Minimap (Orthographic Camera) Setup
const aspectRatio = 1; // Set to square ratio for minimap
const mapSize = 100; // Adjust size to make the minimap larger
const miniMapCamera = new THREE.OrthographicCamera(-mapSize * aspectRatio, mapSize * aspectRatio, mapSize, -mapSize, 0.1, 500);
miniMapCamera.position.set(0, 100, 0); // Place the camera directly above
miniMapCamera.lookAt(0, 0, 0); // Look at the center of the scene


// Create a separate renderer for the minimap
const miniMapRenderer = new THREE.WebGLRenderer({ alpha: true });
miniMapRenderer.setSize(1000, 1000); // Smaller size for the minimap
miniMapRenderer.domElement.style.position = 'absolute';
miniMapRenderer.domElement.style.bottom = '-160px';
miniMapRenderer.domElement.style.left = '-480px';
miniMapRenderer.domElement.style.pointerEvents = 'none'; // Make the minimap non-interactive so i can still click on elements under it
miniMapRenderer.domElement.style.zIndex = 10; /* Ensure it's above other elements */
document.body.appendChild(miniMapRenderer.domElement);

//----------------------------------LOAD PLAYER ANIMATIONS-----------------------------------

const loader = new FBXLoader();
loader.load('asset/jogPlayer.fbx', (joggingfbx) => {
  character = joggingfbx; // Load character into the scene
  character.position.set(24, 0, 2.5);
  character.scale.set(0.045, 0.045, 0.045);
  scene.add(character);

  mixer = new THREE.AnimationMixer(character);
  walkAction = mixer.clipAction(joggingfbx.animations[0]); // Jogging animation
  walkAction.loop = THREE.LoopRepeat;
  walkAction.play();

  loader.load('asset/idlePlayer.fbx', (idleFBX) => {
    idleAction = mixer.clipAction(idleFBX.animations[0]); // Idle animation
    idleAction.loop = THREE.LoopRepeat;
    idleAction.play();
    idleAction.weight = 1; // Full weight for idle
    walkAction.weight = 0; // No weight for jogging initially
  });

  setInitialCameraPosition();
}, (xhr) => {
  console.log((xhr.loaded / xhr.total * 100) + '% loaded');
}, (error) => {
  console.error('Error loading jogging FBX', error);
});

//----------------------------------PLAYER MOVEMENT-----------------------------------

let hasMoved = false; // Track if the player has moved

document.addEventListener('keydown', (event) => {
  if (!isPaused && keys.hasOwnProperty(event.key)) {
    keys[event.key] = true;  // Set the corresponding key state to true
  }
  if (event.key === 'c' || event.key === 'C') {
    viewChangedTD = !viewChangedTD;
    console.log("Camera view changed:", viewChangedTD ? "Top-down" : "Normal");
  }
});

document.addEventListener('keyup', (event) => {
  if (!isPaused && keys.hasOwnProperty(event.key)) {
    keys[event.key] = false;  // Set the corresponding key state to false
  }
});


//----------------------------------CAMERA SETUP--------------------------------------

// Add this after other variable declarations
let viewChangedTD = false;
// Set the initial camera position
function setInitialCameraPosition() {
  if (character) {
    if (viewChangedTD) {
      // Set initial top-down view
      camera.position.set(character.position.x, character.position.y + 1.5, character.position.z - 2);
    } else {
      // Set initial normal view
      camera.position.set(character.position.x, character.position.y + 1.0, character.position.z -2);
    }
    camera.lookAt(character.position);
  }
}



function updateCameraTD() {
  if (character) {
    console.log("in top-down view");
    camera.position.x = character.position.x;
    camera.position.y = character.position.y + 15;
    camera.position.z = character.position.z - 0.5;
    camera.lookAt(character.position);
  }
}

function updateCamera() {
  if (character) {
    // Position the camera at the character's head level and slightly back
    camera.position.set(character.position.x, character.position.y + 15, character.position.z - 10); // Adjust height and distance as needed
    camera.lookAt(character.position); // Look at the character
  }
}
// function updateCamera() {
//   if (character) {
//     if (viewChangedTD) {
//       updateCameraTD();
//     } else {
//       camera.position.x = character.position.x;
//       camera.position.y = character.position.y + 10;
//       camera.position.z = character.position.z + 10;
//       camera.lookAt(character.position);
//     }
//   }
// }

//-------------------------------MAZE IMPLEMENTATION-------------------------------------

const gltfLoader = new GLTFLoader();
let greenGeometry = null, greenMaterial = null, greenMesh = null;

function loadMaze1() {
  gltfLoader.load('asset/Maze2.glb', (gltf) => {
  maze = gltf.scene;
  maze.position.set(0, 0, 0);  // Adjust position if necessary
  maze.scale.set(55, 55, 55);  // Adjust scale if necessary
  scene.add(maze);  // Add the maze to the scene

  // Once the maze is loaded, create and add the greenMesh
  greenGeometry = new THREE.PlaneGeometry(2, 6.5);  // Width and height of the rectangle
  greenMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff00,  // Base color (green)
    emissive: 0x00ff00,  // green emission light
    emissiveIntensity: 1,  // Intensity of the emissive light
    side: THREE.DoubleSide,  // Makes the plane visible from both sides
  });

  greenMesh = new THREE.Mesh(greenGeometry, greenMaterial);
  greenMesh.position.set(25, 0, -1);  // Position the object behind the player
  greenMesh.scale.set(3.3, 3.8, 3.8);
  scene.add(greenMesh);  // Add the green mesh after the maze has been added
  }, (xhr) => {
  console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  }, (error) => {
  console.error('An error occurred loading the maze:', error);
  console.log('Error details:', error.target?.responseText || 'No response text');
  });
}

loadMaze1();

// Exit zone for end of maze
const exitGeometry = new THREE.PlaneGeometry(1.8, 4);  // Width and height of the rectangle
const exitMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,  // Base color (white)
  emissive: 0xffffff,  // White emission light
  emissiveIntensity: 1,  // Intensity of the emissive light
//   side: THREE.DoubleSide,  // Makes the plane visible from both sides
 });

const exitMesh = new THREE.Mesh(exitGeometry, exitMaterial);
exitMesh.position.set(30, 5, 54);  // Position the exit object at the end of the maze
exitMesh.scale.set(3.3, 3.3, 3.8);
scene.add(exitMesh);

//--------------------------------COIN LOADING----------------------------------------

let coins = [];  // To store all coin objects
let coinModel;
const coinLoader = new FBXLoader();
coinLoader.load('asset/coin.fbx', (fbx) => {
    coinModel = fbx;  // Save the loaded model
    coinModel.scale.set(0.01, 0.01, 0.01);  // Scale down the coin model
    addCoinsToMaze();  // Once the coin model is loaded, place it in the maze
}, (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
}, (error) => {
    console.error('An error occurred loading the coin model:', error);
});

const coinPositions = [
  { x: 3.5, y: 5, z: 9 },
  { x: 7.5, y: 5, z: 23.5 },
  { x: 19.5, y: 5, z: 8.5 },
  { x: 18.5, y: 5, z: 35 },
  { x: 25, y: 5, z: 39 },
  { x: 33, y: 5, z: 2 },
  { x: 41, y: 5, z: 16 },
  { x: 46, y: 5, z: 51.5 },
  { x: 52, y: 5, z: 9.5 },
];

function countCoinsInScene() {
  return scene.children.filter(object => object.name === "Coin").length;
}

function addCoinsToMaze() {
  // Clear any existing coins before adding new ones
  coins.forEach(coin => scene.remove(coin));
  coins = [];

  // Only add coins if it's level 2 or 3
  if (currentLevel === 2 || currentLevel === 3) {
    coinPositions.forEach(pos => {
        const coin = coinModel.clone();
        coin.name = "Coin";  // Set the name for easier identification
        coin.position.set(pos.x, pos.y, pos.z);
        scene.add(coin);
        coins.push(coin);  // Add the coin to the array
    });
    totalCoins = coins.length;
  } else {
    totalCoins = 0;
  }
}

//--------------------------------COLLISION DETECTION------------------------------------

// Raycaster for collision detection
const raycaster = new THREE.Raycaster();

let characterBox = new THREE.Box3();
let exitBox = new THREE.Box3();
exitBox.setFromObject(exitMesh);
const exitSize = new THREE.Vector3();
exitMesh.geometry.computeBoundingBox();
exitMesh.geometry.boundingBox.getSize(exitSize);

exitBox.setFromCenterAndSize(
  exitMesh.position,
  exitSize.multiplyScalar(0.9)  // 90% of the actual size for a tighter fit
);

let greenBox = new THREE.Box3();

// Add these new functions
function multiRaycast(origin, direction, spread = 1) {
  // Cast three rays - center, left and right of the character
  const rays = [
    direction.clone(),
    direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 0.25 * spread),
    direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI * 0.25 * spread)
  ];

  for (const rayDir of rays) {
    raycaster.set(origin, rayDir.normalize());
    const intersects = raycaster.intersectObjects(maze.children, true);
    if (intersects.length > 0 && intersects[0].distance < 2) {
      return true;
    }
  }
  return false;
}
function handleExitCollision(moveDirection) {
  console.log("Exit collision detected for level:", currentLevel);
  if (!character || !exitMesh) return false;

  // Create a box3 for the character and exit mesh
  const characterBox = new THREE.Box3().setFromObject(character);
  const exitBox = new THREE.Box3().setFromObject(exitMesh);

  // Check if character is intersecting or very close to exit mesh
 if (characterBox.intersectsBox(exitBox)) {
   if (currentLevel === 1) {
     handleLevelTransition();
     return true;
   } 
   else if (currentLevel === 2 || currentLevel === 3) {
    const remainingCoins = countCoinsInScene();
     if (remainingCoins === 0) {
       handleLevelTransition();
       return true;
     } else {
       // Push the player back when they try to exit without all coins
       const pushBackDistance = 1.0;
       
       // Calculate push direction based on player's position relative to exit
       const exitCenter = new THREE.Vector3();
       exitBox.getCenter(exitCenter);
       const pushDirection = new THREE.Vector3(
         character.position.x - exitCenter.x,
         0, // Set y component to 0
         character.position.z - exitCenter.z
       ).normalize();
       
       // Move the character back
       character.position.x += pushDirection.x * pushBackDistance;
       character.position.z += pushDirection.z * pushBackDistance;
       
       // Visual feedback for missing coins
       const coinCounter = document.getElementById('coinCounter');
       coinCounter.style.color = 'red';
       setTimeout(() => {
         coinCounter.style.color = 'white';
       }, 500);
       
       return true;
     }
   }
 }
  return false;
}

// Update checkCollisions function to use the improved exit detection
function checkCollisions(moveDirection) {
  // First check maze collisions with multiple rays
  if (multiRaycast(character.position, moveDirection)) {
    return true;
  }

  // Check exit collision with improved detection
  if (handleExitCollision(moveDirection)) {
    return true;
  }

  // Check green mesh collision if it exists
  if (greenMesh) {
    raycaster.set(character.position, moveDirection);
    const greenIntersects = raycaster.intersectObject(greenMesh);
    if (greenIntersects.length > 0 && greenIntersects[0].distance < 2) {
      return true;
    }
  }

  return false;
}

//--------------------------------COIN COLLECTION LOGIC-------------------------------

// Function to check for coin collection
function checkCoinCollection() {
  const characterBox = new THREE.Box3().setFromObject(character);

  scene.children.forEach((object, index) => {
    if (object.name === 'Coin') {
      const coinBox = new THREE.Box3().setFromObject(object);
      const coinCenter = new THREE.Vector3;
      coinBox.getCenter(coinCenter);
      const coinSize = new THREE.Vector3();
      coinBox.getSize(coinSize);

      const scaleFactor = 0.6;
      const smallerCoinBox = new THREE.Box3().setFromCenterAndSize(coinCenter, coinSize.multiplyScalar(scaleFactor));

      if (characterBox.intersectsBox(coinBox)) {
      scene.remove(object);  // Remove the coin from the scene
      coins.splice(index, 1);  // Remove the coin from the array
      console.log('Coin collected!');
      updateCoinDisplay();  // Update the coin counter
      }
    }
  });
}

// Function to update coin display on screen
let totalCoins = coinPositions.length;
let collectedCoins = 0;

function updateCoinDisplay() {
  const remaining = countCoinsInScene();
  document.getElementById('coinCounter').innerText = `Coins remaining: ${remaining}`;
}


//---------------------------------GAME TIMER-----------------------------------------

// Initialize timer variables
let timeLeft = 60;  // Default to 1 minute for level 1
let timerId;
let flashInterval; // To store the interval for the flashing effect

// Function to start the timer
function startTimer() {
  if (timerId) {
    clearInterval(timerId);
  }
  if (flashInterval) {
    clearInterval(flashInterval);
    document.body.classList.remove('flashing');
  }

  timerId = setInterval(() => {
    if (!isPaused) {
      if (timeLeft <= 0) {
      clearInterval(timerId);
      clearInterval(flashInterval);
      document.body.classList.remove('flashing');
      showGameOver(); // Show game over modal
    } else {
      timeLeft--;
      document.getElementById('timer').textContent = timeLeft;

      if (timeLeft <= 5 && !flashInterval) {
        flashInterval = setInterval(() => {
          document.body.classList.toggle('flashing');
        }, 300);
      }
      }
    }
    
  }, 1000);
}


//----------------------------------GAME LOGIC-----------------------------------------

let isGameOver = false; // Track if the game is over
let timerStarted = false;
let isPaused = false;
let pauseButton;

// Function to start Level 1
function level1() {
  timeLeft = 60; // 1-minute countdown
  currentLevel = 1;
  collectedCoins = 0;
  document.getElementById('coinCounter').style.display = 'none'; // Hide coins for level 1
  resetPlayerPosition();
  addCoinsToMaze(); // Place coins if needed for Level 1
}

// Function to start Level 2
function level2() {
  console.log("Starting level 2");
  timeLeft = 90; // 1.5-minute countdown
  currentLevel = 2;
  collectedCoins = 0;
  document.querySelector('.ui-item:nth-child(2)').style.display = 'block';
  document.getElementById('coinCounter').style.display = 'block';
  document.getElementById('coinCounter').innerText = `Coins remaining: ${totalCoins}`;
  resetPlayerPosition();
  startTimer(); // Start timer for Level 2
  addCoinsToMaze(); // Place coins for Level 2
}

// Function to start Level 3
function level3() {
  timeLeft = 120; // 2-minute countdown
  currentLevel = 3;
  collectedCoins = 0;
  document.querySelector('.ui-item:nth-child(2)').style.display = 'block';
  document.getElementById('coinCounter').style.display = 'block';
  document.getElementById('coinCounter').innerText = `Coins remaining: ${totalCoins}`;
  resetPlayerPosition();
  startTimer(); // Start timer for Level 3
  addCoinsToMaze(); // Place coins for Level 3
}

// Function to handle level transitions
function handleLevelTransition() {
  console.log("Handling level transition for level:", currentLevel);
  if (currentLevel === 1) {
    setTimeout(() => {
      level2(); // Move to Level 2
    }, 100);
  }
  if (currentLevel === 2) {
    setTimeout(() => {
      level3(); // Move to Level 3
    }, 100);
  } else if (currentLevel === 3) {
    clearInterval(timerId); // Stop the timer
    showGameWon(); // Show game won modal as the game is completed
  }
}
// Function to reset the player position at the start of each level
function resetPlayerPosition() {
  if (character) {
    // Force position reset with exact coordinates
    character.position.set(24, 1.5, 2.5);  // Reset to exact starting position
    character.rotation.y = 0;  // Reset rotation to face forward
    
    // Force an immediate update to ensure position is set
    character.updateMatrix();
    character.updateMatrixWorld(true);
  } else {
    console.error("Character or character position is undefined.");
  }
}

// Function to show the Game Over modal
function showGameOver() {
  clearInterval(timerId);
  clearInterval(flashInterval);
  document.body.classList.remove('flashing');
  isGameOver = true;
  document.getElementById('gameOverModal').style.display = 'flex';
  // Reset the level to 1 when game over
  currentLevel = 1;
  collectedCoins = 0;
}

// Function to show the Game Won modal
function showGameWon() {
  clearInterval(timerId); // Stop the timer
  isGameOver = true; // Set game state to over
  document.getElementById('gameWonModal').style.display = 'flex'; // Show the modal
}

function restartGame() {
  // Stop the existing timer and flashing effects
  clearInterval(timerId);
  clearInterval(flashInterval);
  document.body.classList.remove('flashing'); // Reset the background color

  // Reset game state
  timeLeft = 60; // Reset timer for Level 1
  document.getElementById('timer').textContent = timeLeft; // Reset timer display
  document.getElementById('coinCounter').style.display = 'none'; // Hide the coin counter at the beginning of the game
  document.getElementById('gameOverModal').style.display = 'none'; // Hide the game over modal
  document.getElementById('gameWonModal').style.display = 'none'; // Hide the game won modal
  document.getElementById('startModal').style.display = 'flex'; // Show the start message again
  hasMoved = false; // Reset movement tracker
  timerStarted = false; // Reset timerStarted to false
  isGameOver = false; // Reset game state to active

  // Ensure we load Level 1 (Maze 1)
  currentLevel = 1;  // Reset to Level 1
  collectedCoins = 0; // Reset collected coins counter
  document.getElementById('coinCounter').innerText = `Coins remaining: ${totalCoins}`; // Reset coin display

  // Remove maze
  if (maze) {
    scene.remove(maze);  // Remove the current maze
  }

  // Remove all coins from the scene
  coins.forEach(coin => {
    scene.remove(coin); // Assuming `scene` is your Three.js scene
  });

  // Load Maze 1 again and reset player position to start
  loadMaze1();  // Call a function to load Maze 1

  // Reset player position to the start of Maze 1
  character.position.set(24, 0, 2.5); // Set to the initial starting position for Level 1
}

function initializePauseButton() {
  pauseButton = document.getElementById('pauseButton');
  if (pauseButton) {
      pauseButton.addEventListener('click', togglePause);
  }
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        clearInterval(timerId);
        pauseButton.innerHTML = '<i class="fas fa-play"></i> Resume';
    } else {
        startTimer();
        pauseButton.innerHTML = '<i class="fas fa-pause"></i> Pause';
    }
}

document.addEventListener('DOMContentLoaded', initializePauseButton);

// Add an event listener for the restart button
const restartButton = document.getElementById('restartButton');
if (restartButton) {
    restartButton.addEventListener('click', restartGame);
}

const restartGameButton = document.getElementById('restartGameButton');
if (restartGameButton) {
  restartGameButton.addEventListener('click', restartGame);
}

// Add event listener for navigating back to the main menu
document.getElementById('returnToMenu').addEventListener('click', () => {
  window.location.href = 'index.html'; // Navigate to Main menu page
});

const restartGameButtonW = document.getElementById('restartGameButtonW');
if (restartGameButtonW) {
  restartGameButtonW.addEventListener('click', restartGame);
}

// Add event listener for navigating back to the main menu
document.getElementById('returnToMenuW').addEventListener('click', () => {
  window.location.href = 'index.html'; // Navigate to Main menu page
});

//---------------------------------GAME LOOP-----------------------------------------

// Start the game at level 1
level1();

// Main game loop
function animate() {
  requestAnimationFrame(animate);
 

  if (!isPaused) {
    const delta = clock.getDelta();
      if (mixer) mixer.update(delta);

      // Log character's position if it exists
      if (character) {
        console.log(`Character Position: x = ${character.position.x}, y = ${character.position.y}, z = ${character.position.z}`);
      }

    // Player movement logic
    if (!isGameOver && character) {
      let isMoving = false;
      let direction = new THREE.Vector3(0, 0, 0);

      // Check key states for movement
      if (keys.w) {
        direction.z += 1;
        isMoving = true;
      }
      if (keys.s) {
        direction.z -= 1;
        isMoving = true;
      }
      if (keys.a) {
        direction.x += 1;
        isMoving = true;
      }
      if (keys.d) {
        direction.x -= 1;
        isMoving = true;
      }

      if (direction.length() > 0) {
        direction.normalize();

        // Hide start modal and start the timer on the first move
        if (!hasMoved && currentLevel === 1) {
          document.getElementById('startModal').style.display = 'none';
          hasMoved = true;
        }
        
        if (hasMoved && currentLevel === 1) {
          if (!timerStarted) {
            startTimer();
            timerStarted = true;
          }
        }

        // Store current position in case we need to revert
        const previousPosition = character.position.clone();
        
        // Try to move
        if (!checkCollisions(direction)) {
          character.position.add(direction.multiplyScalar(0.5));
          
          // Double-check if new position is valid
          if (checkCollisions(direction)) {
            // If not valid, revert to previous position
            character.position.copy(previousPosition);
          }
        }

        // Rotate the character towards the direction of movement
        const targetAngle = Math.atan2(direction.x, direction.z);
        const currentAngle = character.rotation.y;
        const angleDifference = targetAngle - currentAngle;
        const shortestAngleDifference = THREE.MathUtils.euclideanModulo(angleDifference + Math.PI, Math.PI * 2) - Math.PI;
        character.rotation.y += shortestAngleDifference * 0.1;

        // Increase animation playback speed when moving
        if (walkAction) {
          walkAction.timeScale = 1.5;
        }

        // Transition between idle and jogging animations
        if (walkAction && idleAction) {
          walkAction.weight = THREE.MathUtils.lerp(walkAction.weight, 1, 0.1);
          idleAction.weight = THREE.MathUtils.lerp(idleAction.weight, 0, 0.1);
        }

      } else {
        // Slow down animation when idle
        if (walkAction) {
          walkAction.timeScale = 1;
        }

        // Transition back to idle animation
        if (walkAction && idleAction) {
          walkAction.weight = THREE.MathUtils.lerp(walkAction.weight, 0, 0.1);
          idleAction.weight = THREE.MathUtils.lerp(idleAction.weight, 1, 0.1);
        }
      }

      // Update the weights of the actions
      if (walkAction) walkAction.setEffectiveWeight(walkAction.weight);
      if (idleAction) idleAction.setEffectiveWeight(idleAction.weight);
    }

    checkCoinCollection();
    updateCamera();  // Update camera based on player position
  }

  
 
  

  miniMapRenderer.render(scene, miniMapCamera); // Render the minimap
  renderer.render(scene, camera);  // Render the scene
}

// Start the game loop
animate();

