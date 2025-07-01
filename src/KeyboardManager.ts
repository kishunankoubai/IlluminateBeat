class KeyboardManager {
    private pressingKeys: string[] = [];
    private pressTimes: number[] = [];
    private valid: boolean = false;
    private keydownEvent: (e: KeyboardEvent) => any;
    private keyupEvent: (e: KeyboardEvent) => any;
    onKeydown: Function = () => {};
    onKeyup: Function = () => {};
    constructor() {
        this.keydownEvent = (e: KeyboardEvent) => {
            if (!this.pressingKeys.includes(e.code)) {
                this.pressingKeys.push(e.code);
                this.pressTimes.push(Date.now());
                this.onKeydown();
                //console.log("Pressed:" + e.code);
            }
        };
        this.keyupEvent = (e: KeyboardEvent) => {
            this.pressingKeys = this.pressingKeys.filter((keys, i) => {
                this.pressTimes[i] = -1;
                return keys != e.code;
                //console.log("Unpressed:" + e.code);
            });
            this.pressTimes = this.pressTimes.filter((time) => time != -1);
            this.onKeyup();
        };
    }

    //有効かどうか
    get isValid(): boolean {
        return this.valid;
    }

    //押された最新のキー
    get latestPressingKey(): string {
        return this.pressingKeys.length != 0 ? this.pressingKeys[this.pressingKeys.length] : "";
    }

    //押された最古のキー
    get oldestPressingKey(): string {
        return this.pressingKeys.length != 0 ? this.pressingKeys[0] : "";
    }

    //まだ押されているキーのうちの押された最古の時間
    get latestPressTime(): number {
        return this.pressTimes.length != 0 ? this.pressTimes[this.pressTimes.length] : -1;
    }

    //まだ押されているキーのうちの押された最新の時間
    get oldestPressTime(): number {
        return this.pressTimes.length != 0 ? this.pressTimes[0] : -1;
    }

    //入力を受け取るのを開始する
    start() {
        if (this.valid) {
            return;
        }
        document.addEventListener("keydown", this.keydownEvent);
        document.addEventListener("keyup", this.keyupEvent);
        this.valid = true;
    }

    //入力を受け取るのを停止する
    stop() {
        if (!this.valid) {
            return;
        }
        this.valid = false;
        document.removeEventListener("keydown", this.keydownEvent);
        document.removeEventListener("keyup", this.keyupEvent);
        this.pressingKeys = [];
        this.pressTimes = [];
    }

    //指定したキーが押されているか
    isPressing(keyCode: string): boolean {
        return this.pressingKeys.includes(keyCode);
    }

    //指定した複数のキーがすべて押されているか
    arePressing(keyCodes: string[]): boolean {
        let arePressing = true;
        keyCodes.forEach((keyCode) => {
            arePressing = arePressing && this.isPressing(keyCode);
        });
        return arePressing;
    }

    //指定した複数のキーのどれかが押されているか
    existsPressingKey(keyCodes: string[]) {
        let existsPressingKey = false;
        keyCodes.forEach((keyCode) => {
            existsPressingKey = existsPressingKey || this.isPressing(keyCode);
        });
        return existsPressingKey;
    }

    //指定したキーが押された時間を返す
    //選択されていない場合は-1を返す
    getPressTime(keyCode: string): number {
        if (this.pressingKeys.indexOf(keyCode) == -1) {
            return -1;
        }
        return this.pressTimes[this.pressingKeys.indexOf(keyCode)];
    }

    //指定した複数のキーの中で最も遅くに押されたものを返す
    //どれも押されていない場合は空文字を返す
    getLatestPressingKey(keyCodes: string[]): string {
        let index = -1;
        keyCodes.forEach((keyCode) => {
            const i = this.pressingKeys.indexOf(keyCode);
            if (index < i) {
                index = i;
            }
        });
        return index == -1 ? "" : this.pressingKeys[index];
    }

    //指定した複数のキーの中で最も早くに押されたものを返す
    //どれも押されていない場合は空文字を返す
    getOldestPressingKey(keyCodes: string[]): string {
        let index = Infinity;
        keyCodes.forEach((keyCode) => {
            const i = this.pressingKeys.indexOf(keyCode);
            if (i < index && i != -1) {
                index = i;
            }
        });
        return index == -1 ? "" : this.pressingKeys[index];
    }

    getAllPressingKeys(keyCodes: string[]): string[] {
        return this.pressingKeys.filter((keyCode) => keyCodes.includes(keyCode));
    }
}
