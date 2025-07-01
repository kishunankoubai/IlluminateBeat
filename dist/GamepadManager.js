"use strict";
class GamepadManager {
    gamepads = new Map();
    updateGamepadInformation() {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        this.gamepads.clear();
        for (const pad of pads) {
            if (pad && pad.connected) {
                this.gamepads.set(pad.index, {
                    index: pad.index,
                    id: pad.id,
                    buttons: pad.buttons.map((b) => ({ pressed: b.pressed, touched: b.touched, value: b.value })),
                    axes: [...pad.axes],
                    connected: pad.connected,
                    timestamp: pad.timestamp,
                });
            }
        }
    }
    getGamepadStates() {
        return Array.from(this.gamepads.values());
    }
    getButtonValue(gamepadIndex, buttonIndex) {
        const pad = this.gamepads.get(gamepadIndex);
        return pad ? pad.buttons[buttonIndex]?.value : undefined;
    }
    isButtonPressed(gamepadIndex, buttonIndex) {
        const pad = this.gamepads.get(gamepadIndex);
        if (!pad) {
            return false;
        }
        return pad ? !!pad.buttons[buttonIndex]?.pressed : false;
    }
    getAxes(gamepadIndex) {
        const pad = this.gamepads.get(gamepadIndex);
        return pad ? pad.axes : undefined;
    }
}
