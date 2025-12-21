import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const EffectsOverlay = () => {
    const [activeLayer, setActiveLayer] = useState<'snow-globe' | 'fireplace'>('snow-globe');
    const globeRef = useRef<HTMLDivElement>(null);
    const emitterRef = useRef<HTMLDivElement>(null);
    const shakeButtonRef = useRef<HTMLButtonElement>(null);
    const isAnimating = useRef(false);
    const cache = useRef<gsap.core.Timeline[]>([]);
    const [showMoments, setShowMoments] = useState(false);

    // Snow logic
    useEffect(() => {
        if (activeLayer !== 'snow-globe') return;
        const emitter = emitterRef.current;
        if (!emitter) return;

        const count = 200;
        const frequency = 120;
        let last = performance.now();

        const randMinMax = (min: number, max: number) => min + Math.random() * (max - min);

        const createParticle = () => {
            const particle = document.createElement("div");
            particle.className = "particle";
            emitter.appendChild(particle);

            const startX = randMinMax(0, emitter.offsetWidth);
            particle.style.left = `${startX}px`;
            const startScale = randMinMax(0.5, 2.5);
            const startOpacity = randMinMax(0.4, 0.8);
            gsap.set(particle, { y: 0, scale: startScale, autoAlpha: startOpacity });

            const fallTime = randMinMax(4, 7);
            const driftX = randMinMax(-100, 100);

            const tl = gsap.timeline({
                paused: true,
                onComplete: () => {
                    tl.pause(0);
                    cache.current.push(tl);
                }
            });

            tl.to(particle, {
                duration: fallTime,
                y: emitter.offsetHeight,
                x: startX + driftX,
                ease: "none"
            }).to(particle, {
                duration: 0.5,
                autoAlpha: 0,
                ease: "none"
            });

            cache.current.push(tl);
            return tl;
        };

        for (let i = 0; i < count; i++) createParticle();

        const spawnBurst = (amount = 5) => {
            for (let i = 0; i < amount; i++) {
                let tl = cache.current.shift();
                if (!tl) tl = createParticle();
                tl.play(0);
            }
        };

        const emit = () => {
            const nowTime = performance.now();
            if (nowTime - last > frequency) {
                spawnBurst(2);
                last = nowTime;
            }
        };

        gsap.ticker.add(emit);

        // Pointer rotation for propellers and Gary's eye
        const interactiveElements = [
            { selector: ".propeller[data-yellow]", rotateXRange: [20, -20], rotateYRange: [-20, 20], duration: 0.6 },
            { selector: ".propeller[data-pink]", rotateXRange: [25, -25], rotateYRange: [-25, 25], duration: 0.9 },
            { selector: ".propeller[data-purple]", rotateXRange: [15, -15], rotateYRange: [-15, 15], duration: 0.4 }
        ];

        const elementsSetters = interactiveElements.map((item) => ({
            rotateXSetter: gsap.quickTo(item.selector, "rotationX", { duration: item.duration }),
            rotateYSetter: gsap.quickTo(item.selector, "rotationY", { duration: item.duration }),
            rotateXRange: item.rotateXRange,
            rotateYRange: item.rotateYRange
        }));

        const eyeSetter = gsap.quickTo(".gary__eye", "rotation", { duration: 0.5 });

        const handlePointerMove = (e: PointerEvent) => {
            const xPercent = e.clientX / window.innerWidth;
            const yPercent = e.clientY / window.innerHeight;

            elementsSetters.forEach((el) => {
                el.rotateXSetter(gsap.utils.interpolate(el.rotateXRange[0], el.rotateXRange[1], yPercent));
                el.rotateYSetter(gsap.utils.interpolate(el.rotateYRange[0], el.rotateYRange[1], xPercent));
            });

            if (!isAnimating.current) {
                const eyeRotation = gsap.utils.interpolate(-120, 120, xPercent);
                eyeSetter(eyeRotation);
            }
        };

        window.addEventListener("pointermove", handlePointerMove);

        return () => {
            gsap.ticker.remove(emit);
            window.removeEventListener("pointermove", handlePointerMove);
            if (emitter) emitter.innerHTML = '';
            cache.current = [];
        };
    }, [activeLayer]);

    // Fire Particles Logic
    useEffect(() => {
        if (activeLayer !== 'fireplace') return;

        const createParticles = (containerId: string, count: number, particleClass: string = "fire-particle") => {
            const container = document.getElementById(containerId);
            if (!container) return;

            for (let i = 0; i < count; i++) {
                const p = document.createElement("div");
                p.classList.add(particleClass);
                p.style.animationDelay = `${(Math.random()).toFixed(2)}s`;
                p.style.left = `calc((100% - 2.5em) * ${i / count})`;
                container.appendChild(p);
            }
        };

        // Delay slightly to ensure DOM is ready
        const timer = setTimeout(() => {
            createParticles("fire-container", 50);
            createParticles("fire-container-2", 50);
            createParticles("fire-container-3", 50, "fire-particle-2");
        }, 100);

        return () => {
            clearTimeout(timer);
            ["fire-container", "fire-container-2", "fire-container-3"].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });
        };
    }, [activeLayer]);

    // Cycling transition: cycle every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveLayer(prev => prev === 'snow-globe' ? 'fireplace' : 'snow-globe');
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleShake = () => {
        if (isAnimating.current) return;
        isAnimating.current = true;

        gsap.to(globeRef.current, {
            x: () => 25 * (Math.random() > 0.5 ? 1 : -1),
            y: () => 25 * (Math.random() > 0.5 ? 1 : -1),
            repeat: 11,
            yoyo: true,
            duration: 0.04,
            onUpdate: () => {
                for (let i = 0; i < 10; i++) {
                    let tl = cache.current.shift();
                    if (tl) tl.play(0);
                }
            },
            onComplete: () => {
                gsap.set(globeRef.current, { x: 0, y: 0 });
                isAnimating.current = false;
            }
        });

        gsap.set(".gary__eye", { transformOrigin: "50% 50%" });
        gsap.to(".gary__eye", { rotation: 1080, duration: 2.5, ease: "power2.out" });

        setShowMoments(true);
        setTimeout(() => setShowMoments(false), 4000);
    };

    return (
        <>
            {/* Layer 1: Snow Globe - Interactive overlay on the right */}
            <div className={`snow-globe-overlay transition-opacity duration-1000 ${activeLayer === 'snow-globe' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ zIndex: 30 }}>
                <div className="snow-globe" ref={globeRef}>
                    <div className="dome">
                        <div id="emitter" ref={emitterRef}></div>
                        <img className="propeller" src="https://assets.codepen.io/86916/snow-globe-yellow-propeller.svg" alt="" data-yellow />
                        <img className="propeller" src="https://assets.codepen.io/86916/snow-globe-pink-propeller.svg" alt="" data-pink />
                        <img className="propeller" src="https://assets.codepen.io/86916/snow-globe-purple-propeller.svg" alt="" data-purple />
                        <div className="sand"></div>
                        <img className="pineapple-house" src="https://assets.codepen.io/86916/snow-globe-pineapple-house.svg" alt="" />
                        <div className="gary">
                            <img src="https://assets.codepen.io/86916/snow-globe-gary.svg" alt="" />
                            <svg className="gary__eye" data-right xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 13">
                                <path fill="#d83411" d="M13.824 4.211c0 2.326-2.11 4.212-4.713 4.212S4.398 6.537 4.398 4.21 6.508 0 9.111 0s4.713 1.885 4.713 4.211" />
                                <path fill="#000" d="M11.724 3.96c0 1.245-1.122 2.255-2.506 2.255-1.385 0-2.507-1.01-2.507-2.256s1.122-2.256 2.507-2.256c1.384 0 2.506 1.01 2.506 2.256" />
                            </svg>
                            <svg className="gary__eye" data-left xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                <path fill="#d83411" d="M13.566 4.56c0 2.519-2.285 4.56-5.103 4.56-2.819 0-5.104-2.041-5.104-4.56S5.644 0 8.463 0s5.103 2.042 5.103 4.56" />
                                <path fill="#000" d="M11.288 4.287c0 1.349-1.215 2.443-2.714 2.443-1.5 0-2.715-1.094-2.715-2.443 0-1.35 1.216-2.443 2.715-2.443s2.714 1.094 2.714 2.443" />
                            </svg>
                        </div>
                        <img className="dome__glare" src="https://assets.codepen.io/86916/snow-globe-glare.svg" alt="" />
                    </div>
                    <div className="base">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 77 9" className="base__sign">
                            <path fill="currentColor" d="m71.123.328 1.12 4.752q.667 0 1.4-5.033h2.238v.557L76.162 9h-2.238l.281-4.195h-.562q0 2.513-1.4 4.195h-.276l-1.4-6.434h-.563l.562 6.153h-2.52l.282-1.4V4.804L68.047.604l.281-.276zM64.633 2.68v.287l.287-.287 1.436.287h.86l.288 1.435v1.436q-.78 3.164-2.01 3.164h-1.728q-2.298 0-2.297-4.887 0-1.148 3.164-1.435m-1.154.861-.575.861v.287q0 2.122.862 2.303h1.154q.698 0 .861-2.877zM60.328.281h.563V2.25h-2.813v4.5l.281 1.969h-.843L56.109 9l.282-6.187h-1.688V0zM53.563.281h.562V2.25h-2.812v4.5l.28 1.969h-.843L49.344 9l.281-6.187h-1.687V0zM44.523 2.68v.287l.287-.287 1.436.287h.861l.288 1.435v1.436q-.78 3.164-2.01 3.164h-1.729q-2.297 0-2.297-4.887 0-1.148 3.164-1.435m-1.154.861-.574.861v.287q0 2.122.861 2.303h1.154q.697 0 .862-2.877zM40.236.885v2.238q-.163.838-1.957.838v.562q2.52 0 2.52 2.795v.844q0 .557-.844.557L34.641 9V.047h3.92q1.675.175 1.675.838m-4.195 0v2.52h1.676v-.563h.281l-.281-.276V.885zm-.562 4.476v1.4l.562.557h2.238l1.4-.275v-.844q-.28-.837-1.681-.838zM29.016.484q1.318 0 1.646 2.403H28.36V1.17zm1.646 3.364-.328 5.15h-1.975v-5.15zM25.647 4.389V1.945l-.27-1.898h2.443l-.27 8.408-.814.545h-1.09q-.468 0-2.712-6.24h-.27V9h-1.629l.276-6.785h-.545V.047h2.168q.433 0 2.443 4.342zM18.484.484q1.32 0 1.647 2.403h-2.303V1.17zm1.647 3.364-.328 5.15h-1.975v-5.15zM14.883 0h2.32v.293L14.01 5.227 16.916 9H14.01q-.95-3.193-1.453-3.193h-1.448v2.9L9.656 9V.58h2.9l-.286 1.453V2.9l.58.586h.58q.661 0 1.453-3.486M7.375.484q1.319 0 1.646 2.403H6.72V1.17zm1.646 3.364-.328 5.15H6.72v-5.15zM5.596.885v2.238q-.165.838-1.957.838v.562q2.52 0 2.52 2.795v.844q0 .557-.845.557L0 9V.047h3.92q1.676.175 1.676.838M1.4.885v2.52h1.676v-.563h.281l-.28-.276V.885zM.838 5.36v1.4l.562.557H3.64l1.4-.275v-.844q-.28-.837-1.682-.838z" />
                        </svg>
                    </div>
                    <div className="action">
                        <button id="shakeButton" onClick={handleShake} ref={shakeButtonRef}>
                            <span className="visually-hidden">Shake the snow globe!</span>
                            <img src="https://assets.codepen.io/86916/snow-globe-button-text.svg" alt="Shake" />
                        </button>
                    </div>
                    <div className="a-few-moments-later" style={{ opacity: showMoments ? 1 : 0, display: showMoments ? 'block' : 'none', transition: 'opacity 0.5s' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 53 37">
                            <path fill="#FFEF5D" d="m45.887 35.383.27-.27h.269l.27 1.887h-2.157v-1.617zM43.121 35.383l.27-.27h.27L43.93 37h-2.157v-1.617zM40.356 35.383l.269-.27h.27l.27 1.887h-2.157v-1.617zM37.842 31l-.815 2.725 1.366 3-2.73.275-.821-3h-1.36v2.455h-1.365V28h1.635q3.82 0 3.82 1.635zm-3.27-2.18v3.815h1.91v-3l-.82-.815zM31.57 28v1.125h-4.5v1.125h2.813l.281 1.406h-2.25v2.25l.563.563h2.812V37h-5.344v-1.125l-.28-7.594.28-.281zM24.523 28.281h.563v1.969h-2.813v4.5l.282 1.969h-.844L20.305 37l.28-6.187h-1.687V28zM11.914 28h5.063l1.406 9h-2.531l-.282-1.969h-2.25V37h-1.968v-.281l1.687-6.469h-1.125zm2.813 1.688-.282 3.375v.28h.844l1.406-.28-.843-3.376zM7.594 28.316v.815l-.27 5.97 3.528-.544V37H5.965v-.815l-.27-8.138zM47.162 14h.815l4.095.275v.545l-.275 1.905-3.275-.815h-.545l-.545.545V17l4.365 2.455.545 1.635q0 1.91-6.545 1.91v-.545l.275-1.91 2.725.275q1.412 0 1.635-.82-4.635-1.846-4.635-4.09 0-1.306 1.365-1.91M44.664 14.281h.563v1.969h-2.813v4.5l.281 1.969h-.843L40.445 23l.282-6.187h-1.688V14zM36.326 18.389v-2.444l-.27-1.898H38.5l-.27 8.408-.814.545h-1.09q-.468 0-2.713-6.24h-.27V23h-1.628l.275-6.785h-.545v-2.168h2.168q.434 0 2.444 4.342zM30.89 14v1.125h-4.5v1.125h2.813l.281 1.406h-2.25v2.25l.563.563h2.812V23h-5.343v-1.125l-.282-7.594.282-.281zM19.373 14.328l1.12 4.752q.667 0 1.4-5.033h2.238v.556L24.412 23h-2.238l.281-4.195h-.562q0 2.513-1.4 4.195h-.276l-1.4-6.434h-.563l.562 6.153h-2.52l.282-1.4v-2.514l-.281-4.201.281-.276zM12.746 14.047h.58q2.31 0 2.309 4.623v2.308q0 2.022-3.469 2.022h-1.441q-2.022 0-2.022-2.602v-1.441q0-4.623 1.154-4.623zm-2.309 5.197v2.022l.575.58h2.021l.293-1.448q0-4.33-1.447-4.33h-.287q-1.155 0-1.155 3.176M3.076 14.328l1.12 4.752q.667 0 1.4-5.033h2.238v.556L8.115 23H5.877l.281-4.195h-.562q0 2.513-1.4 4.195H3.92l-1.4-6.434h-.563l.563 6.153H0l.281-1.4v-2.514L0 14.604l.281-.276zM34.445.281 34.165 0h1.124v1.125q0 5.907.844 5.906h.281l.281-.843-.28-4.5v-.563h2.812v3.938l.28 1.406h.563V1.406L40.352 0h1.687l-1.125 9h-1.406q-.639 0-1.125-3.375h-.563Q37.393 9 36.695 9q-1.968 0-1.968-3.937zM33.61 0v1.125h-4.5V2.25h2.812l.281 1.406h-2.25v2.25l.563.563h2.812V9h-5.344V7.875l-.28-7.594.28-.281zM24.098 2.285v1.4h1.957v1.12h-2.801V9h-1.957V.047h5.877v2.238zM10.969 0h5.062l1.407 9h-2.532l-.281-1.969h-2.25V9h-1.969v-.281l1.688-6.469h-1.125zm2.812 1.688L13.5 5.063v.28h.844l1.406-.28-.844-3.375z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Layer 2: Fireplace - Background image and custom fire particles */}
            <div className={`fireplace-container transition-opacity duration-1000 ${activeLayer === 'fireplace' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <img id="fire-base-img" src="https://assets.codepen.io/12550455/good-place-2.jpg" alt="Fireplace" />
                <div id="fire-container"></div>
                <div id="fire-container-2"></div>
                <div id="fire-container-3"></div>
            </div>

            {/* SVG Definitions */}
            <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
                <defs>
                    <clipPath id="snowflake" clipPathUnits="objectBoundingBox">
                        <path d="m0.625,0.284,0.248,-0.142,0.126,0.217,-0.248,0.142,0.247,0.142,-0.126,0.217,-0.248,-0.142 V1 h-0.252 V0.717 L0.126,0.859 l-0.126,-0.216,0.248,-0.142 L0,0.358 l0.126,-0.216,0.247,0.142 V0 h0.252" />
                    </clipPath>
                    <clipPath id="sand" clipPathUnits="objectBoundingBox">
                        <path d="M0.76,0.058 c-0.008,0.01,-0.012,0.021,-0.02,0.03 c-0.042,0.048,-0.104,-0.001,-0.147,-0.017 c-0.079,-0.029,-0.162,0.052,-0.241,0.066 c-0.036,0.007,-0.071,0.033,-0.107,0.036 C0.166,0.18,0.085,0.125,0.006,0.11 H0 l0,0.89 H1 V0 h-0.05 c-0.047,0,-0.091,0.007,-0.137,0.033 c-0.021,0.012,-0.033,0.001,-0.053,0.025" />
                    </clipPath>
                    <clipPath id="propeller" clipPathUnits="objectBoundingBox">
                        <path d="M0.403,0.004 C0.464,-0.008,0.516,0.006,0.546,0.046 c0.031,0.041,0.036,0.104,0.011,0.178 l0,0.001 c-0.01,0.031,-0.018,0.06,-0.021,0.084 c-0.004,0.025,-0.003,0.044,0.001,0.056 c0.003,0.011,0.01,0.019,0.023,0.022 c0.014,0.003,0.036,0.001,0.068,-0.011 c0.024,-0.009,0.041,-0.03,0.056,-0.057 c0.015,-0.028,0.026,-0.06,0.041,-0.093 c0.014,-0.032,0.032,-0.064,0.058,-0.086 c0.026,-0.022,0.061,-0.032,0.106,-0.023 c0.024,0.004,0.044,0.012,0.06,0.025 c0.017,0.014,0.029,0.034,0.039,0.061 c0.012,0.034,0.015,0.066,0.009,0.098 c-0.006,0.031,-0.019,0.06,-0.037,0.086 c-0.039,0.058,-0.087,0.058,-0.133,0.059 c-0.032,0.001,-0.07,0.004,-0.1,0.018 c-0.03,0.014,-0.052,0.037,-0.058,0.078 c-0.003,0.019,0,0.032,0.006,0.041 c0.006,0.01,0.016,0.019,0.029,0.025 c0.026,0.013,0.06,0.015,0.083,0.013 c0.063,-0.004,0.104,0.023,0.122,0.068 c0.018,0.044,0.012,0.099,-0.007,0.146 c-0.019,0.047,-0.053,0.09,-0.096,0.109 c-0.043,0.019,-0.094,0.013,-0.146,-0.034 c-0.025,-0.023,-0.037,-0.057,-0.041,-0.091 c-0.004,-0.034,-0.002,-0.071,0.001,-0.101 c0.004,-0.036,-0.001,-0.063,-0.012,-0.081 c-0.011,-0.017,-0.029,-0.027,-0.058,-0.024 c-0.024,0.002,-0.04,0.029,-0.042,0.066 c-0.002,0.035,0.004,0.053,0.012,0.079 c0.003,0.009,0.006,0.02,0.01,0.032 q0.002,0.008,0.005,0.017 c0.011,0.039,0.011,0.074,0.002,0.103 c-0.009,0.029,-0.026,0.05,-0.047,0.065 c-0.041,0.029,-0.098,0.032,-0.144,0.015 c-0.046,-0.017,-0.088,-0.057,-0.087,-0.122 c0,-0.031,0.011,-0.066,0.032,-0.103 c0.022,-0.037,0.055,-0.077,0.104,-0.121 c0.026,-0.023,0.032,-0.043,0.032,-0.055 c0,-0.011,-0.007,-0.023,-0.021,-0.032 c-0.029,-0.017,-0.079,-0.011,-0.111,0.041 c-0.031,0.05,-0.087,0.086,-0.141,0.092 c-0.055,0.006,-0.111,-0.016,-0.139,-0.087 C0,0.562,-0.004,0.523,0.004,0.489 c0.007,-0.034,0.025,-0.062,0.047,-0.084 c0.043,-0.043,0.107,-0.062,0.159,-0.057 c0.016,0.002,0.035,0.012,0.053,0.024 c0.019,0.012,0.038,0.026,0.058,0.037 c0.02,0.011,0.038,0.019,0.053,0.02 c0.014,0.001,0.026,-0.004,0.034,-0.018 c0.008,-0.013,0.013,-0.031,0.013,-0.047 c0,-0.015,-0.004,-0.022,-0.008,-0.027 c-0.006,-0.006,-0.015,-0.01,-0.027,-0.014 c-0.012,-0.004,-0.026,-0.008,-0.04,-0.015 c-0.014,-0.007,-0.028,-0.018,-0.037,-0.037 c-0.058,-0.11,-0.007,-0.249,0.095,-0.269 m0.142,0.488 c-0.002,-0.02,-0.021,-0.034,-0.042,-0.03 s-0.036,0.024,-0.033,0.044 s0.021,0.034,0.042,0.03 c0.021,-0.004,0.036,-0.024,0.033,-0.044" />
                    </clipPath>
                </defs>
            </svg>
        </>
    );
};

export default EffectsOverlay;
