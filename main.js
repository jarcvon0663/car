// Variables del juego
        let scene, camera, renderer, car, road, obstacles = [], buildings = [], roadLines = [], particles = [];
        let score = 0, level = 1;
        let carSpeed = 0.8;
        let baseCarSpeed = 0.8;
        let carTargetX = 0;
        let isGameOver = false;
        let gameStarted = false;
        let roadOffset = 0;
        let cameraShake = 0;
        let carLoaded = false;

        // Referencias DOM
        const scoreElement = document.getElementById('score');
        const levelElement = document.getElementById('level');
        const speedFillElement = document.getElementById('speed-fill');
        const gameOverElement = document.getElementById('game-over');
        const finalScoreElement = document.getElementById('final-score');
        const finalLevelElement = document.getElementById('final-level');
        const restartBtn = document.getElementById('restart-btn');
        const startBtn = document.getElementById('start-btn');
        const startScreen = document.getElementById('start-screen');
        const loadingElement = document.getElementById('loading');
        const leftBtn = document.getElementById('left-btn');
        const rightBtn = document.getElementById('right-btn');
        const controlsElement = document.getElementById('controls');

        // Timers y contadores
        let buildingSpawnTimer = 0;
        const buildingSpawnInterval = 40;
        let roadLineSpawnTimer = 0;
        const roadLineSpawnInterval = 8;
        let obstacleSpawnTimer = 0;
        let particleSpawnTimer = 0;

        function init() {
            // Configuración de la escena
            scene = new THREE.Scene();
            
            // Configurar ambiente inicial
            updateEnvironment();

            // Cámara con perspectiva mejorada
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 12, 18);
            camera.lookAt(0, 0, -10);

            // Renderizador con configuración mejorada
            renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                powerPreference: "high-performance"
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            document.getElementById('container').appendChild(renderer.domElement);

            // Sistema de iluminación mejorado
            setupLighting();

            // Crear auto (usando GLTFLoader para el modelo de Ferrari)
            loadCar();

            // Crear carretera mejorada
            createRoad();

            // Configurar controles
            setupControls();

            // Detectar dispositivos móviles
            if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
                controlsElement.style.display = 'flex';
            }

            // Render inicial
            renderer.render(scene, camera);
        }

        function loadCar() {
            // Mostrar loading
            loadingElement.style.display = 'block';
            
            // Intentar cargar el modelo Ferrari, si falla usar auto básico
            if (typeof THREE.GLTFLoader !== 'undefined') {
                const loader = new THREE.GLTFLoader();
                
                // Configurar DRACO si está disponible
                if (typeof THREE.DRACOLoader !== 'undefined') {
                    const dracoLoader = new THREE.DRACOLoader();
                    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
                    loader.setDRACOLoader(dracoLoader);
                }
                
                loader.load(
                    'https://threejs.org/examples/models/gltf/ferrari.glb',
                    function (gltf) {
                        car = gltf.scene;
                        car.scale.set(0.02, 0.02, 0.02);
                        car.position.set(0, 0.5, 0);
                        car.rotation.y = Math.PI;
                        
                        car.traverse(function (node) {
                            if (node.isMesh) {
                                node.castShadow = true;
                                node.receiveShadow = true;
                            }
                        });
                        
                        scene.add(car);
                        carLoaded = true;
                        loadingElement.style.display = 'none';
                        console.log('Ferrari cargado exitosamente');
                    },
                    function (progress) {
                        console.log('Progreso de carga:', progress);
                    },
                    function (error) {
                        console.log('Error cargando Ferrari, usando auto básico:', error);
                        createBasicCar();
                        carLoaded = true;
                        loadingElement.style.display = 'none';
                    }
                );
            } else {
                // Si GLTFLoader no está disponible, usar auto básico
                createBasicCar();
                carLoaded = true;
                loadingElement.style.display = 'none';
            }
        }

        function createBasicCar() {
            // Auto más detallado usando geometrías básicas
            const carGroup = new THREE.Group();

            // Cuerpo principal
            const bodyGeometry = new THREE.BoxGeometry(3, 1.2, 6);
            const bodyMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xff4444,
                metalness: 0.8,
                roughness: 0.2
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 1;
            body.castShadow = true;
            carGroup.add(body);

            // Cabina
            const cabinGeometry = new THREE.BoxGeometry(2.5, 1, 3);
            const cabinMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x222222,
                metalness: 0.1,
                roughness: 0.8,
                transparent: true,
                opacity: 0.7
            });
            const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
            cabin.position.y = 2;
            cabin.position.z = -0.5;
            cabin.castShadow = true;
            carGroup.add(cabin);

            // Ruedas
            const wheelGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 12);
            const wheelMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                metalness: 0.3,
                roughness: 0.7
            });
            
            const wheelPositions = [
                [-1.5, 0.8, 2], [1.5, 0.8, 2], [-1.5, 0.8, -2], [1.5, 0.8, -2]
            ];
            
            carGroup.userData.wheels = [];
            wheelPositions.forEach(pos => {
                const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
                wheel.position.set(...pos);
                wheel.rotation.z = Math.PI / 2;
                wheel.castShadow = true;
                carGroup.add(wheel);
                carGroup.userData.wheels.push(wheel);
            });

            // Faros delanteros
            const headlightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const headlightMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffffaa,
                emissive: 0xffffaa,
                emissiveIntensity: 0.5
            });
            
            const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            leftHeadlight.position.set(-1, 1.2, 3.2);
            carGroup.add(leftHeadlight);
            
            const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            rightHeadlight.position.set(1, 1.2, 3.2);
            carGroup.add(rightHeadlight);

            // Luces traseras
            const taillightGeometry = new THREE.SphereGeometry(0.2, 6, 6);
            const taillightMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 0.3
            });
            
            const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
            leftTaillight.position.set(-1, 1, -3.2);
            carGroup.add(leftTaillight);
            
            const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
            rightTaillight.position.set(1, 1, -3.2);
            carGroup.add(rightTaillight);

            car = carGroup;
            car.position.set(0, 0.5, 0);
            scene.add(car);
        }

        function setupLighting() {
            // Luz ambiental suave
            const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
            scene.add(ambientLight);

            // Luz direccional principal (sol)
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
            dirLight.position.set(50, 100, 50);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            dirLight.shadow.camera.near = 0.5;
            dirLight.shadow.camera.far = 500;
            dirLight.shadow.camera.left = -100;
            dirLight.shadow.camera.right = 100;
            dirLight.shadow.camera.top = 100;
            dirLight.shadow.camera.bottom = -100;
            scene.add(dirLight);

            // Luces de ambiente urbano
            const streetLight1 = new THREE.PointLight(0xffaa00, 0.8, 50);
            streetLight1.position.set(-25, 15, -50);
            scene.add(streetLight1);

            const streetLight2 = new THREE.PointLight(0xffaa00, 0.8, 50);
            streetLight2.position.set(25, 15, -50);
            scene.add(streetLight2);
        }

        function createRoad() {
            // Carretera principal
            const roadGeometry = new THREE.PlaneGeometry(35, 800);
            const roadMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                roughness: 0.8,
                metalness: 0.1
            });
            road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            road.receiveShadow = true;
            scene.add(road);

            // Bordillos
            const curbGeometry = new THREE.BoxGeometry(2, 0.5, 800);
            const curbMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            
            const leftCurb = new THREE.Mesh(curbGeometry, curbMaterial);
            leftCurb.position.set(-18, 0.25, 0);
            leftCurb.receiveShadow = true;
            scene.add(leftCurb);
            
            const rightCurb = new THREE.Mesh(curbGeometry, curbMaterial);
            rightCurb.position.set(18, 0.25, 0);
            rightCurb.receiveShadow = true;
            scene.add(rightCurb);

            // Aceras
            const sidewalkGeometry = new THREE.PlaneGeometry(8, 800);
            const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
            
            const leftSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
            leftSidewalk.rotation.x = -Math.PI / 2;
            leftSidewalk.position.set(-23, 0.01, 0);
            leftSidewalk.receiveShadow = true;
            scene.add(leftSidewalk);
            
            const rightSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
            rightSidewalk.rotation.x = -Math.PI / 2;
            rightSidewalk.position.set(23, 0.01, 0);
            rightSidewalk.receiveShadow = true;
            scene.add(rightSidewalk);
        }

        function updateEnvironment() {
            // Cambiar ambiente según el nivel
            const timeOfDay = Math.floor((level - 1) / 3) % 4;
            
            switch(timeOfDay) {
                case 0: // Día
                    scene.background = new THREE.Color(0x87ceeb);
                    scene.fog = new THREE.Fog(0x87ceeb, 20, 300);
                    break;
                case 1: // Tarde
                    scene.background = new THREE.Color(0xff7f50);
                    scene.fog = new THREE.Fog(0xff7f50, 20, 250);
                    break;
                case 2: // Noche
                    scene.background = new THREE.Color(0x191970);
                    scene.fog = new THREE.Fog(0x191970, 15, 200);
                    break;
                case 3: // Amanecer
                    scene.background = new THREE.Color(0xffa07a);
                    scene.fog = new THREE.Fog(0xffa07a, 20, 280);
                    break;
            }
        }

        function setupControls() {
            document.addEventListener('keydown', onKeyDown);
            document.addEventListener('keyup', onKeyUp);
            
            // Controles táctiles mejorados
            leftBtn.addEventListener('touchstart', (e) => { 
                e.preventDefault(); 
                moveCar(-1);
                leftBtn.style.background = 'rgba(255, 255, 255, 0.4)';
            });
            
            leftBtn.addEventListener('touchend', (e) => { 
                e.preventDefault();
                leftBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            });
            
            rightBtn.addEventListener('touchstart', (e) => { 
                e.preventDefault(); 
                moveCar(1);
                rightBtn.style.background = 'rgba(255, 255, 255, 0.4)';
            });
            
            rightBtn.addEventListener('touchend', (e) => { 
                e.preventDefault();
                rightBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            });
            
            restartBtn.addEventListener('click', restartGame);
            startBtn.addEventListener('click', startGame);
        }

        let keysPressed = {};

        function onKeyDown(event) {
            keysPressed[event.key] = true;
            if (event.key === ' ') {
                event.preventDefault();
                if (!gameStarted && carLoaded) startGame();
            }
        }

        function onKeyUp(event) {
            keysPressed[event.key] = false;
        }

        function handleInput() {
            if (!gameStarted || isGameOver) return;
            
            if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) {
                carTargetX -= 2.5; // Movimiento continuo más lento para teclado
                carTargetX = Math.max(-12, Math.min(12, carTargetX));
            }
            if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) {
                carTargetX += 2.5; // Movimiento continuo más lento para teclado
                carTargetX = Math.max(-12, Math.min(12, carTargetX));
            }
        }

        function moveCar(direction) {
            if (!gameStarted || isGameOver) return;
            carTargetX += direction * 6;
            carTargetX = Math.max(-12, Math.min(12, carTargetX));
            
            // Efecto de inclinación del auto
            if (car) {
                car.rotation.z = direction * 0.1;
                setTimeout(() => {
                    if (car && car.rotation) car.rotation.z *= 0.9;
                }, 100);
            }
        }

        function startGame() {
            if (!carLoaded) {
                alert('Espera a que termine de cargar el auto');
                return;
            }
            
            gameStarted = true;
            startScreen.style.display = 'none';
            animate();
        }

        function createObstacle() {
            const obstacleTypes = ['pothole', 'police', 'cone', 'barrier'];
            const obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
            let obstacle;

            switch(obstacleType) {
                case 'pothole':
                    obstacle = createPothole();
                    break;
                case 'police':
                    obstacle = createPolice();
                    break;
                case 'cone':
                    obstacle = createCone();
                    break;
                case 'barrier':
                    obstacle = createBarrier();
                    break;
            }

            obstacle.position.x = (Math.random() - 0.5) * 25;
            obstacle.position.z = -200;
            obstacle.userData = { type: obstacleType };
            
            obstacles.push(obstacle);
            scene.add(obstacle);
        }

        function createPothole() {
            const geometry = new THREE.RingGeometry(1.5, 3, 16);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x111111,
                side: THREE.DoubleSide,
                roughness: 1.0
            });
            const pothole = new THREE.Mesh(geometry, material);
            pothole.rotation.x = -Math.PI / 2;
            pothole.position.y = 0.01;
            pothole.receiveShadow = true;
            return pothole;
        }

        function createPolice() {
            const group = new THREE.Group();
            
            // Cuerpo
            const bodyGeometry = new THREE.BoxGeometry(1.5, 3.5, 1.5);
            const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x000080 });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 1.75;
            body.castShadow = true;
            group.add(body);

            // Cabeza
            const headGeometry = new THREE.SphereGeometry(0.8, 12, 12);
            const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.y = 4;
            head.castShadow = true;
            group.add(head);

            // Sombrero de policía
            const hatGeometry = new THREE.CylinderGeometry(1, 0.9, 0.5, 12);
            const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x000080 });
            const hat = new THREE.Mesh(hatGeometry, hatMaterial);
            hat.position.y = 4.8;
            hat.castShadow = true;
            group.add(hat);

            // Señal de STOP
            const signGeometry = new THREE.BoxGeometry(2, 2, 0.1);
            const signMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                emissive: 0x440000,
                emissiveIntensity: 0.2
            });
            const sign = new THREE.Mesh(signGeometry, signMaterial);
            sign.position.set(1.5, 2.5, 0);
            sign.castShadow = true;
            group.add(sign);

            // Texto STOP en la señal
            const textGeometry = new THREE.PlaneGeometry(1.5, 0.5);
            const textMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0.9
            });
            const text = new THREE.Mesh(textGeometry, textMaterial);
            text.position.set(1.5, 2.5, 0.06);
            group.add(text);

            group.scale.set(1.2, 1.2, 1.2);
            return group;
        }

        function createCone() {
            const geometry = new THREE.ConeGeometry(1, 3, 8);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xff6600,
                emissive: 0x331100,
                emissiveIntensity: 0.2
            });
            const cone = new THREE.Mesh(geometry, material);
            cone.position.y = 1.5;
            cone.castShadow = true;
            cone.receiveShadow = true;
            
            // Rayas blancas reflectantes
            const stripeGeometry = new THREE.RingGeometry(0.9, 1.1, 8);
            const stripeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffffff,
                emissive: 0x222222,
                emissiveIntensity: 0.1
            });
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            stripe.position.y = 2;
            stripe.rotation.x = -Math.PI / 2;
            cone.add(stripe);
            
            return cone;
        }

        function createBarrier() {
            const group = new THREE.Group();
            
            const barrierGeometry = new THREE.BoxGeometry(8, 1, 0.5);
            const barrierMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffff00,
                emissive: 0x222200,
                emissiveIntensity: 0.1,
                roughness: 0.7,
                metalness: 0.3
            });
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrier.position.y = 0.5;
            barrier.castShadow = true;
            group.add(barrier);
            
            // Soportes
            for (let i = -3; i <= 3; i += 3) {
                const supportGeometry = new THREE.BoxGeometry(0.3, 2, 0.3);
                const supportMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x666666,
                    metalness: 0.8,
                    roughness: 0.3
                });
                const support = new THREE.Mesh(supportGeometry, supportMaterial);
                support.position.set(i, 1, 0);
                support.castShadow = true;
                group.add(support);
            }
            
            return group;
        }

        function createBuilding(zPos, side) {
            const height = Math.random() * 40 + 15;
            const width = Math.random() * 12 + 6;
            const depth = Math.random() * 10 + 5;

            const geometry = new THREE.BoxGeometry(width, height, depth);
            
            // Colores variados para los edificios
            const colors = [0x666666, 0x888888, 0x555555, 0x777777, 0x999999];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const material = new THREE.MeshStandardMaterial({ 
                color: color,
                roughness: 0.8,
                metalness: 0.2
            });
            const building = new THREE.Mesh(geometry, material);

            building.position.y = height / 2;
            building.position.z = zPos;
            building.position.x = side === 'left' ? 
                -(25 + width / 2 + Math.random() * 10) : 
                (25 + width / 2 + Math.random() * 10);

            building.castShadow = true;
            building.receiveShadow = true;

            // Ventanas iluminadas (especialmente de noche)
            if (level > 6) { // Niveles nocturnos
                addWindows(building, width, height, depth);
            }

            buildings.push(building);
            scene.add(building);
        }

        function addWindows(building, width, height, depth) {
            const windowsGroup = new THREE.Group();
            
            for (let y = 2; y < height - 2; y += 4) {
                for (let x = -width/2 + 2; x < width/2 - 2; x += 3) {
                    if (Math.random() > 0.3) { // 70% probabilidad de ventana iluminada
                        const windowGeometry = new THREE.PlaneGeometry(1.5, 2);
                        const windowMaterial = new THREE.MeshStandardMaterial({ 
                            color: 0xffffaa,
                            emissive: 0xffffaa,
                            emissiveIntensity: 0.3,
                            transparent: true,
                            opacity: 0.8
                        });
                        const window = new THREE.Mesh(windowGeometry, windowMaterial);
                        window.position.set(x, y - height/2, depth/2 + 0.01);
                        windowsGroup.add(window);
                    }
                }
            }
            
            building.add(windowsGroup);
        }

        function createRoadLine(zPos) {
            const geometry = new THREE.PlaneGeometry(0.8, 12);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xffffff,
                emissive: 0x222222,
                emissiveIntensity: 0.1
            });
            const line = new THREE.Mesh(geometry, material);
            
            line.rotation.x = -Math.PI / 2;
            line.position.y = 0.02;
            line.position.z = zPos;
            line.position.x = 0;
            roadLines.push(line);
            scene.add(line);
        }

        function createParticle(x, z, color = 0xffffff) {
            const geometry = new THREE.SphereGeometry(0.15, 6, 6);
            const material = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.set(x, 0.5, z);
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    Math.random() * 4 + 1,
                    Math.random() * 3
                ),
                life: 1.0,
                maxLife: 1.0
            };
            
            particles.push(particle);
            scene.add(particle);
        }

        function updateParticles() {
            particles = particles.filter(particle => {
                particle.userData.life -= 0.025;
                particle.material.opacity = particle.userData.life;
                
                particle.position.add(particle.userData.velocity);
                particle.userData.velocity.y -= 0.12; // Gravedad
                particle.userData.velocity.multiplyScalar(0.98); // Fricción
                
                if (particle.userData.life <= 0) {
                    scene.remove(particle);
                    return false;
                }
                return true;
            });
        }

        function updateGameDifficulty() {
            // Aumentar nivel cada 500 puntos
            const newLevel = Math.floor(score / 500) + 1;
            if (newLevel > level) {
                level = newLevel;
                levelElement.innerText = level;
                
                // Aumentar velocidad gradualmente
                baseCarSpeed = 0.8 + (level - 1) * 0.3;
                carSpeed = baseCarSpeed;
                
                // Cambiar ambiente
                updateEnvironment();
                
                // Efecto visual de nivel up
                createLevelUpEffect();
            }
            
            // Velocidad variable basada en puntuación
            carSpeed = baseCarSpeed + Math.sin(score * 0.01) * 0.2;
            
            // Actualizar indicador de velocidad
            const speedPercent = Math.min(((carSpeed - 0.8) / 3) * 100, 100);
            speedFillElement.style.width = speedPercent + '%';
        }

        function createLevelUpEffect() {
            // Crear múltiples partículas doradas cuando se sube de nivel
            for (let i = 0; i < 25; i++) {
                setTimeout(() => {
                    createParticle(
                        (Math.random() - 0.5) * 30,
                        (Math.random() - 0.5) * 20,
                        0xffd700
                    );
                }, i * 40);
            }
            
            // Shake de cámara
            cameraShake = 0.6;
        }

        function checkCollisions() {
            if (!car) return;
            
            const carBox = new THREE.Box3().setFromObject(car);
            
            obstacles.forEach((obstacle, index) => {
                const obstacleBox = new THREE.Box3().setFromObject(obstacle);
                if (carBox.intersectsBox(obstacleBox)) {
                    // Efecto de explosión
                    createExplosionEffect(obstacle.position.x, obstacle.position.z);
                    gameOver();
                }
            });
        }

        function createExplosionEffect(x, z) {
            // Crear partículas de explosión
            for (let i = 0; i < 20; i++) {
                setTimeout(() => {
                    createParticle(x + (Math.random() - 0.5) * 4, z, 0xff4444);
                    createParticle(x + (Math.random() - 0.5) * 4, z, 0xffaa00);
                }, i * 20);
            }
            cameraShake = 1.2;
        }

        function updateCameraShake() {
            if (cameraShake > 0) {
                camera.position.x = (Math.random() - 0.5) * cameraShake;
                camera.position.y = 12 + (Math.random() - 0.5) * cameraShake;
                cameraShake *= 0.92;
                
                if (cameraShake < 0.01) {
                    cameraShake = 0;
                    camera.position.x = 0;
                    camera.position.y = 12;
                }
            }
        }

        function animate() {
            if (!gameStarted || isGameOver) return;

            requestAnimationFrame(animate);

            // Manejar input continuo
            handleInput();

            // Movimiento suave del auto
            if (car) {
                car.position.x += (carTargetX - car.position.x) * 0.15;
                
                // Rotación de ruedas si es auto básico
                if (car.userData.wheels) {
                    car.userData.wheels.forEach(wheel => {
                        wheel.rotation.x += carSpeed * 0.5;
                    });
                }
                
                // Efecto de humo/partículas del escape
                if (Math.random() > 0.8) {
                    createParticle(
                        car.position.x + (Math.random() - 0.5) * 2,
                        car.position.z - 3,
                        0x888888
                    );
                }
            }

            // Movimiento de la carretera
            roadOffset += carSpeed;
            road.position.z = (roadOffset % 400);

            // Mover todos los objetos
            [...obstacles, ...buildings, ...roadLines].forEach(obj => {
                obj.position.z += carSpeed;
            });

            // Generar obstáculos con frecuencia variable
            obstacleSpawnTimer += carSpeed;
            const spawnRate = Math.max(35 - level * 2, 18); // Más obstáculos en niveles altos
            if (obstacleSpawnTimer >= spawnRate && obstacles.length < 6) {
                createObstacle();
                obstacleSpawnTimer = 0;
            }
            
            // Generar edificios
            buildingSpawnTimer += carSpeed;
            if (buildingSpawnTimer >= buildingSpawnInterval) {
                const side = Math.random() > 0.5 ? 'left' : 'right';
                createBuilding(-200, side);
                buildingSpawnTimer = 0;
            }

            // Generar líneas de carretera
            roadLineSpawnTimer += carSpeed;
            if (roadLineSpawnTimer >= roadLineSpawnInterval) {
                createRoadLine(-200);
                roadLineSpawnTimer = 0;
            }

            // Generar partículas de velocidad
            particleSpawnTimer += carSpeed;
            if (particleSpawnTimer >= 8) {
                if (Math.random() > 0.6) {
                    createParticle(
                        (Math.random() - 0.5) * 35,
                        25,
                        0x88ccff
                    );
                }
                particleSpawnTimer = 0;
            }

            // Actualizar partículas
            updateParticles();

            // Limpiar objetos fuera de pantalla
            obstacles = obstacles.filter(o => {
                if (o.position.z > 30) {
                    scene.remove(o);
                    return false;
                }
                return true;
            });
            
            buildings = buildings.filter(b => {
                if (b.position.z > 30) {
                    scene.remove(b);
                    return false;
                }
                return true;
            });
            
            roadLines = roadLines.filter(l => {
                if (l.position.z > 30) {
                    scene.remove(l);
                    return false;
                }
                return true;
            });

            // Verificar colisiones
            checkCollisions();

            // Actualizar dificultad y puntuación
            updateGameDifficulty();
            score += Math.floor(carSpeed * 2);
            scoreElement.innerText = score;

            // Actualizar shake de cámara
            updateCameraShake();

            // Animación de edificios (ligero balanceo en niveles altos)
            if (level > 8) {
                buildings.forEach(building => {
                    building.rotation.z = Math.sin(Date.now() * 0.001 + building.position.x) * 0.02;
                });
            }

            // Render
            renderer.render(scene, camera);
        }

        function gameOver() {
            isGameOver = true;
            finalScoreElement.innerText = score;
            finalLevelElement.innerText = level;
            gameOverElement.style.display = 'block';
            
            // Efecto de game over
            if (car) {
                createExplosionEffect(car.position.x, car.position.z);
            }
        }

        function restartGame() {
            // Reset de variables
            isGameOver = false;
            gameStarted = false;
            score = 0;
            level = 1;
            carSpeed = 0.8;
            baseCarSpeed = 0.8;
            carTargetX = 0;
            roadOffset = 0;
            cameraShake = 0;
            
            // Reset timers
            buildingSpawnTimer = 0;
            roadLineSpawnTimer = 0;
            obstacleSpawnTimer = 0;
            particleSpawnTimer = 0;

            // Limpiar escena
            [...obstacles, ...buildings, ...roadLines, ...particles].forEach(obj => {
                scene.remove(obj);
            });
            obstacles = [];
            buildings = [];
            roadLines = [];
            particles = [];

            // Reset del auto
            if (car) {
                car.position.set(0, 0.5, 0);
                car.rotation.set(0, 0, 0);
            }

            // Reset de la cámara
            camera.position.set(0, 12, 18);
            camera.lookAt(0, 0, -10);

            // Reset del ambiente
            updateEnvironment();

            // Ocultar game over y mostrar pantalla de inicio
            gameOverElement.style.display = 'none';
            startScreen.style.display = 'flex';
            
            // Reset UI
            scoreElement.innerText = '0';
            levelElement.innerText = '1';
            speedFillElement.style.width = '0%';
        }

        // Manejo de redimensionamiento responsivo
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Prevenir zoom en móviles
        document.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('touchmove', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Prevenir menú contextual en móviles
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });

        // Inicializar el juego cuando Three.js esté listo
        function checkThreeJS() {
            if (typeof THREE !== 'undefined') {
                init();
            } else {
                setTimeout(checkThreeJS, 100);
            }
        }

        // Easter egg: Código Konami para modo especial
        let konamiCode = [];
        const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
        
        document.addEventListener('keydown', (e) => {
            if (!gameStarted) return;
            
            konamiCode.push(e.key);
            if (konamiCode.length > konamiSequence.length) {
                konamiCode.shift();
            }
            
            if (JSON.stringify(konamiCode) === JSON.stringify(konamiSequence)) {
                // Activar modo rainbow car
                if (car) {
                    car.traverse(child => {
                        if (child.isMesh && child.material) {
                            const rainbowMaterial = child.material.clone();
                            rainbowMaterial.emissive = new THREE.Color(0x444444);
                            rainbowMaterial.emissiveIntensity = 0.5;
                            child.material = rainbowMaterial;
                            
                            // Animación de colores
                            const originalColor = child.material.color.clone();
                            setInterval(() => {
                                if (child.material) {
                                    child.material.color.setHSL(
                                        (Date.now() * 0.001) % 1,
                                        0.8,
                                        0.5
                                    );
                                }
                            }, 50);
                        }
                    });
                    
                    // Efecto especial
                    for (let i = 0; i < 30; i++) {
                        setTimeout(() => {
                            createParticle(
                                car.position.x + (Math.random() - 0.5) * 8,
                                car.position.z + (Math.random() - 0.5) * 8,
                                Math.random() * 0xffffff
                            );
                        }, i * 30);
                    }
                }
                konamiCode = [];
                console.log('🌈 Modo Rainbow activado!');
            }
        });

        // Inicializar cuando la página esté lista
        checkThreeJS();