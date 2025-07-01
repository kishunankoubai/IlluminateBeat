interface GamepadState {
    index: number;
    id: string;
    buttons: GamepadButton[];
    axes: number[];
    connected: boolean;
    timestamp: number;
}

class GamepadManager {
    private gamepads: Map<number, GamepadState> = new Map();

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

    getGamepadStates(): GamepadState[] {
        return Array.from(this.gamepads.values());
    }

    getButtonValue(gamepadIndex: number, buttonIndex: number): number | undefined {
        const pad = this.gamepads.get(gamepadIndex);
        return pad ? pad.buttons[buttonIndex]?.value : undefined;
    }

    isButtonPressed(gamepadIndex: number, buttonIndex: number): boolean {
        const pad = this.gamepads.get(gamepadIndex);
        if (!pad) {
            return false;
        }
        return pad ? !!pad.buttons[buttonIndex]?.pressed : false;
    }

    getAxes(gamepadIndex: number): number[] | undefined {
        const pad = this.gamepads.get(gamepadIndex);
        return pad ? pad.axes : undefined;
    }
}
