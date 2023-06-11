# Generic Sensors using Thingy52

The Thingy:52 is a very powerful little BLE GATT enabled unit, which comes loaded with onboard sensors.

When developing web applications on desktops, when the target is a mobile web applicaton using sensors
only available on the mobile phone, this module will help development by directing sensor data from
the Thingy:52 directly to the web application under development.  It does so by attaching to the Thingy:52
via Web Bluetooth and channeling sensor data to replaced versions of the global sensor classes.

Hopefully, the web application will not see the difference ;)

NOTE: Please file issues and PRs are welcome.

## Supported sensors

This module will replace/add the following sensor classes on the global object:

* Accelerometer
* AmbientLightSensor
* Gyroscope
* Magnetometer
* TemperatureSensor

## Including the module

Include the following snippet (between the comments) in the top of index.html:

```html
<!DOCTYPE html>
<!-- BEGIN GenericSensor Thingy52 initialization -->
<script type="module" >
    import './src/genericsensor-thingy52.js';
    import { replaceSensors } from './src/sensors.js';

    replaceSensors([
        'Accelerometer',
        'AmbientLightSensor',
        'Gyroscope',
        'Magnetometer',
        'TemperatureSensor'
    ]);
</script>
<!-- END GenericSensor Thingy52 initialization -->

<html>
```

Include the sensors you want to replace in the array passed to the `replaceSensors` function.

## Usage

When the snippet above is included in the web application, a small graphical representation of the Thingy:52
is injected in the lower left corner of the web page.

Press the `+` sign to attach a Thingy:52 via Web Bluetooth.
When connected, the Thingy:52 can be disconnected by pressing the `-` sign.

In the bottom is a battery level indicator for convenience.

Enjoy ;)

There is a live demo [here](https://larsgk.github.io/genericsensor-thingy52)

