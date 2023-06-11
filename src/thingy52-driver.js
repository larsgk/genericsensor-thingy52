// @ts-check

// Thingy52Driver
//
// Supports:
//   * Accelerometer
//   * Gyroscope
//   * Magnetometer
//   * Button
//   * Thermometer
//   * RGB LED
//
// Documentation: https://nordicsemiconductor.github.io/Nordic-Thingy52-FW/documentation/firmware_architecture.html

export const Thingy52Driver = new class extends EventTarget {
    #device // Just allow one device, for now
    #ledCharacteristic

    constructor() {
        super();

        this._onBatteryChange = this._onBatteryChange.bind(this);
        this._onThermometerChange = this._onThermometerChange.bind(this);
        this._onColorChange = this._onColorChange.bind(this);
        this._onAccelerometerChange = this._onAccelerometerChange.bind(this);
        this._onMotionChange = this._onMotionChange.bind(this);
        this._onButtonChange = this._onButtonChange.bind(this);
    }

    async openDevice(device) {
        // if already connected to a device - close it
        if (this.#device) {
            this.disconnect();
        }

        const server = await device.gatt.connect();

        device.ongattserverdisconnected = e => this._disconnected(e);

        this.#device = device;
        this.dispatchEvent(new CustomEvent('connect', {detail: { device }}));

        // Initialize sensor notifications
        
        /** Accelerometer notifications disabled, using Motion notifications
          * instead to include gyro and compass.
          */
        // await this._startAccelerometerNotifications(server);
        
        await this._startMotionNotifications(server);
        await this._startThermometerNotifications(server);
        await this._startColorNotifications(server);
        await this._startButtonClickNotifications(server);

        // NOTE: On Linux/BlueZ, there might be an issue with 16bit IDs
        try {
            await this._startBatteryNotifications(server);
        } catch(err) {
            console.log("Error with battery service: ", err);
        }

        this.#ledCharacteristic = await this._getLedCharacteristic(server);

        console.log('Opened device: ', device);
    }

    _onAccelerometerChange(event) {
        const target = event.target;

        const accel = {
          x: +target.value.getFloat32(0, true).toPrecision(5),
          y: +target.value.getFloat32(4, true).toPrecision(5),
          z: +target.value.getFloat32(8, true).toPrecision(5)
        };

        console.log('accel', accel);

        this.dispatchEvent(new CustomEvent('accelerometer', {
            detail: accel
        }));
    }

    async _startAccelerometerNotifications(server) {
        const service = await server.getPrimaryService('ef680400-9b35-4933-9b10-52ffa9740042');
        const characteristic = await service.getCharacteristic('ef68040a-9b35-4933-9b10-52ffa9740042');
        characteristic.addEventListener('characteristicvaluechanged', this._onAccelerometerChange);
        return characteristic.startNotifications();
    }

    _onMotionChange(event) {
        const target = event.target;

        const accel = {
            x: +target.value.getInt16(0, true) / (1<<10),
            y: +target.value.getInt16(2, true) / (1<<10),
            z: +target.value.getInt16(4, true) / (1<<10)
        };

        const gyro = {
            x: +target.value.getInt16(6, true) / (1<<5),
            y: +target.value.getInt16(8, true) / (1<<5),
            z: +target.value.getInt16(10, true) / (1<<5)
        };

        const compass = {
            x: +target.value.getInt16(12, true) / (1<<4),
            y: +target.value.getInt16(14, true) / (1<<4),
            z: +target.value.getInt16(16, true) / (1<<4)
        };

        this.dispatchEvent(new CustomEvent('accelerometer', {
            detail: accel
        }));
        this.dispatchEvent(new CustomEvent('gyroscope', {
            detail: gyro
        }));

        // Compass readings are not in every event (Thingy52 seems to send 0,0,0 when not)
        if (compass.x !== 0 || compass.y !== 0 || compass.z !== 0) {
            this.dispatchEvent(new CustomEvent('magnetometer', {
                detail: compass
            }));
        }
    }

    async _startMotionNotifications(server) {
        const service = await server.getPrimaryService('ef680400-9b35-4933-9b10-52ffa9740042');
        const characteristic = await service.getCharacteristic('ef680406-9b35-4933-9b10-52ffa9740042');
        characteristic.addEventListener('characteristicvaluechanged', this._onMotionChange);
        return characteristic.startNotifications();
    }

    _onButtonChange(event) {
        const target = event.target;
        const deviceId = target.service.device.id;

        const pressed = target.value.getUint8(0) === 1;

        this.dispatchEvent(new CustomEvent('button', {
            detail: { pressed }
        }));
    }

    async _startButtonClickNotifications(server) {
        const service = await server.getPrimaryService('ef680300-9b35-4933-9b10-52ffa9740042');
        const characteristic = await service.getCharacteristic('ef680302-9b35-4933-9b10-52ffa9740042');
        characteristic.addEventListener('characteristicvaluechanged', this._onButtonChange);
        return characteristic.startNotifications();
    }

    _onBatteryChange(event) {
        const target = event.target;
        const deviceId = target.service.device.id;

        const battery = target.value.getUint8(0);

        this.dispatchEvent(new CustomEvent('battery', {
            detail: { battery }
        }));
    }

    async _startBatteryNotifications(server) {
        const service = await server.getPrimaryService('battery_service');
        const characteristic = await service.getCharacteristic('battery_level');

        // Read and send initial value
        const battery = (await characteristic.readValue()).getUint8(0);
        this.dispatchEvent(new CustomEvent('battery', {
            detail: { battery }
        }));

        characteristic.addEventListener('characteristicvaluechanged', this._onBatteryChange);
        return characteristic.startNotifications();
    }

    _onThermometerChange(event) {
        const target = event.target;

        const integer = target.value.getUint8(0);
        const decimal = target.value.getUint8(1);

        const celsius = Number.parseFloat(`${integer}.${decimal}`);

        const temperature = {
            celsius,
            fahrenheit: celsius * 9 / 5 + 32,
            kelvin: celsius + 273.15
        }

        this.dispatchEvent(new CustomEvent('thermometer', {
            detail: temperature
        }));
    }

    async _startColorNotifications(server) {
        const service = await server.getPrimaryService('ef680200-9b35-4933-9b10-52ffa9740042');
        const characteristic = await service.getCharacteristic('ef680205-9b35-4933-9b10-52ffa9740042');
        characteristic.addEventListener('characteristicvaluechanged', this._onColorChange);
        return characteristic.startNotifications();
    }

    _onColorChange(event) {
        const target = event.target;

        const color = {
            red: target.value.getUint16(0, true),
            green: target.value.getUint16(2, true),
            blue: target.value.getUint16(4, true),
            clear: target.value.getUint16(6, true)
        }

        this.dispatchEvent(new CustomEvent('color', {
            detail: color
        }));
    }

    async _startThermometerNotifications(server) {
        const service = await server.getPrimaryService('ef680200-9b35-4933-9b10-52ffa9740042');
        const characteristic = await service.getCharacteristic('ef680201-9b35-4933-9b10-52ffa9740042');
        characteristic.addEventListener('characteristicvaluechanged', this._onThermometerChange);
        return characteristic.startNotifications();
    }

    setLED(r, g, b) {
        return this.#ledCharacteristic.writeValue(new Uint8Array([1, r, g, b]));
    }

    async _getLedCharacteristic(server) {
        const service = await server.getPrimaryService('ef680300-9b35-4933-9b10-52ffa9740042');
        return await service.getCharacteristic('ef680301-9b35-4933-9b10-52ffa9740042');
    }

    disconnect() {
        this.#device?.gatt?.disconnect();
        this.#device = undefined;
    }

    _disconnected(evt) {
        this.dispatchEvent(new Event('disconnect'));
    }

    async scan() {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['ef680100-9b35-4933-9b10-52ffa9740042'] }],
            optionalServices: [
                "battery_service",
                "ef680200-9b35-4933-9b10-52ffa9740042",
                "ef680300-9b35-4933-9b10-52ffa9740042",
                "ef680400-9b35-4933-9b10-52ffa9740042",
                "ef680500-9b35-4933-9b10-52ffa9740042"
            ]
        });

        if (device) {
            await this.openDevice(device);
        }
    }
}
