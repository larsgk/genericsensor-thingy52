// @ts-check

import { Thingy52Driver } from "./thingy52-driver.js";

const original = {
    Accelerometer: window.Accelerometer,
    AmbientLihtSensor: window.AmbientLightSensor,
    Gyroscope: window.Gyroscope,
    Magnetometer: window.Magnetometer,
    TemperatureSensor: window.TemperatureSensor  // Proposal: https://kenchris.github.io/thermometer/
}

class BaseSensor extends EventTarget {
    #activated
    #hasReading
    #timestamp

    constructor() {
        super();

        this.#activated = false;
        this.#hasReading = false;
        this.#timestamp = null;
    }

    get activated() {
        return this.#activated;
    }

    get hasReading() {
        return this.#hasReading;
    }

    get timestamp() {
        return this.#timestamp;
    }

    start() {
        this.#activated = true;
    }

    stop() {
        this.#activated = false;
    }

    _emitReading() {
        if (this.#activated) {
            this.#timestamp = performance.now();
            this.#hasReading = true;
            this.dispatchEvent(new Event('reading'));
        }
    }
}

class MotionSensor extends BaseSensor {
    #x
    #y
    #z

    constructor() {
        super();
        this.#x = null;
        this.#y = null;
        this.#z = null;

        this.registerHandler = this.registerHandler.bind(this);
    }

    registerHandler(eventname) {
        Thingy52Driver.addEventListener(eventname, this.#handleData.bind(this));
    }

    get x() {
        return this.#x;
    }

    get y() {
        return this.#y;
    }

    get z() {
        return this.#z;
    }

    #handleData({detail}) {
        if (detail) {
            // Remapping to match portrait phone orientation.
            this.#x = -detail.y;
            this.#y = -detail.x;
            this.#z = detail.z;

            this._emitReading();
        }
    }
}


const thingy52Sensors = {};

thingy52Sensors['Accelerometer'] = class extends MotionSensor {
    constructor() {
        super();
        this.registerHandler('accelerometer');
    }
}

thingy52Sensors['Gyroscope'] = class extends MotionSensor {
    constructor() {
        super();
        this.registerHandler('gyroscope');
    }
}

thingy52Sensors['Magnetometer'] = class extends MotionSensor {
    constructor() {
        super();
        this.registerHandler('magnetometer');
    }
}

thingy52Sensors['AmbientLightSensor'] = class extends BaseSensor {
    #illuminance

    constructor() {
        super();
        this.#illuminance = null;

        Thingy52Driver.addEventListener('color', this.#handleData.bind(this));
    }

    get illuminance() {
        return this.#illuminance;
    }

    #handleData({detail}) {
        if (detail) {
            // Jump in steps of 50 and only emit on change
            const value = Math.floor(detail.clear/50) * 50;
            if (value !== this.#illuminance) {
                this.#illuminance = value;
                this._emitReading();
            }
        }
    }
}

thingy52Sensors['TemperatureSensor'] = class extends BaseSensor {
    #celsius
    #fahrenheit
    #kelvin

    constructor() {
        super();
        this.#celsius = null;
        this.#fahrenheit = null;
        this.#kelvin = null;

        Thingy52Driver.addEventListener('thermometer', this.#handleData.bind(this));
    }

    get celsius() {
        return this.#celsius;
    }

    get fahrenheit() {
        return this.#fahrenheit;
    }

    get kelvin() {
        return this.#kelvin;
    }

    #handleData({detail}) {
        if (detail) {
            this.#celsius = detail.celsius;
            this.#fahrenheit = detail.fahrenheit;
            this.#kelvin = detail.kelvin;
            this._emitReading();
        }
    }
}

export function replaceSensors(list) {
    for (const item of list) {
        if (item in thingy52Sensors) {
            window[item] = thingy52Sensors[item];
        }
    }
}

window['replaceSensors'] = replaceSensors;