// @ts-check

import { Thingy52Driver } from "./thingy52-driver.js";

const template = document.createElement('template');
template.innerHTML = `<style>
#panel {
    position: fixed;
    left:0;
    bottom:0;
    background-color: rgba(255, 255, 255, 0.5);
}
#thingy52 {
    position: relative;
    width: 100px;
    height: 100px;
    margin: 5px;
    background-color: black;
    cursor: pointer;
}
#led {
    position: absolute;
    width: 15%;
    height: 15%;
    left: 10%;
    top: 10%;
    border-radius: 50%;
}
#battery {
    position: absolute;
    width: 90%;
    height: 8%;
    left: 5%;
    bottom: 5%;
    background-color: rgba(255, 255, 255, 0.8);
}
#batterylevel {
    width: 0;
    height: 100%;
    margin: 0;
    background-color: green;
}
.disconnected > #led {
    animation: pulse 4s infinite;
    background-color: blue;
}
@keyframes pulse {
    0% { opacity: 0; }
    30% { opacity: 1; }
    60% { opacity: 0; }
    100% { opacity: 0; }
}
.connected > #led {
    background-color: #2F2;
}
#toggle {
    position: absolute;
    font-family: sans-serif;
    font-size: 40px;
    text-align: center;
    left: 30%;
    top: 30%;
    width: 40%;
    height: 40%;
    color: white;
}
.disconnected > #toggle::after {
    content: '+';
}
.connected > #toggle::after {
    content: '-';
}
</style>
<div id='panel'>
  <div id='thingy52' class='disconnected' title='Press to toggle connection'>
    <div id='led'></div>
    <div id='toggle'></div>
    <div id='battery'><div id='batterylevel'></div></div>
  </div>
</div>
`;

export class GenericSensorThingy52 extends HTMLElement {
    #thingy52
    #state
    #batterylevel

    constructor() {
        super();

        const shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(template.content.cloneNode(true));

        this._handleToggle = this._handleToggle.bind(this);
        this._handleConnect = this._handleConnect.bind(this);
        this._handleDisconnect = this._handleDisconnect.bind(this);
        this._handleBattery = this._handleBattery.bind(this);
    }

    connectedCallback() {
        this.#thingy52 = this.shadowRoot.querySelector('#thingy52');
        this.#batterylevel = this.shadowRoot.querySelector('#batterylevel');

        this.#thingy52.addEventListener('click', this._handleToggle)

        this.#setState('disconnected');

        Thingy52Driver.addEventListener('connect', this._handleConnect);
        Thingy52Driver.addEventListener('disconnect', this._handleDisconnect);
        Thingy52Driver.addEventListener('battery', this._handleBattery);
    }

    disconnectedCallback() {
        Thingy52Driver.removeEventListener('connect', this._handleConnect);
        Thingy52Driver.removeEventListener('disconnect', this._handleDisconnect);
        Thingy52Driver.removeEventListener('battery', this._handleBattery);
    }

    #setState(state) {
        this.#state = state;
        this.#thingy52.className = state;
    }

    #setBatteryLevel(battery) {
        this.#batterylevel.style.width = `${battery}%`;

        this.#batterylevel.parentNode.setAttribute('title', `Battery level: ${battery}%`);
    }

    _handleToggle() {
        if (this.#state === 'disconnected') {
            Thingy52Driver.scan();
        } else if (this.#state === 'connected') {
            Thingy52Driver.disconnect();
        }
    }

    _handleConnect() {
        this.#setState('connected');
    }

    _handleDisconnect() {
        this.#setState('disconnected');

        this.#setBatteryLevel(0);
    }

    // Handle battery info (in percentage)
    _handleBattery(/** @type {CustomEvent} */ evt) {
        const {battery} = evt.detail;

        this.#setBatteryLevel(battery);
    }
}
customElements.define('genericsensor-thingy52', GenericSensorThingy52);
