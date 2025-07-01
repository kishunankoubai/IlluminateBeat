class BGM {
    private static context: AudioContext;
    private static gain: GainNode;
    private static audio: AudioBufferSourceNode;
    private static audioBuffer: AudioBuffer;
    private static reversedBuffer: AudioBuffer;

    /**
     * BGM自体のボリューム
     */
    private static volume = 1;
    /**
     * 音声ファイルそれぞれのボリューム
     */
    private static sourceVolume = 1;

    static onEnded = {
        promise: Promise.resolve(),
        cancel: () => {},
    };

    // 現在の論理的な再生位置を追跡
    private static logicalTime: typeof BGM.Time;

    private static initialized = false;
    static init(): void {
        if (this.initialized) throw new Error("BGM is already initialized! Ensure that you are not calling BGM.init() multiple times.");
        this.initialized = true;

        this.context = new AudioContext();
        this.context.suspend();
        this.gain = this.context.createGain();
        this.gain.connect(this.context.destination);

        this.logicalTime = BGM.Time;
    }

    // 音源を読み込む
    static async fetch({ src, loopStart, loopEnd, sourceVolume = 1 }: { src: string; loopStart?: number; loopEnd?: number; sourceVolume?: number }): Promise<void> {
        this.checkInit();

        this.context.suspend();

        this.sourceVolume = sourceVolume;
        this.setVolume(this.volume);

        const audioData = await (await fetch(src)).arrayBuffer();
        this.audioBuffer = await this.context.decodeAudioData(audioData);
        this.reversedBuffer = this.reverseBuffer(this.audioBuffer);

        // 時間管理をリセット
        this.logicalTime.isReversed = false;

        this.logicalTime.currentTime = 0;
        this.logicalTime.lastUpdateTime = 0;
        this.logicalTime.lastUpdateContextTime = this.context.currentTime;

        this.logicalTime.loopStart = loopStart ?? 0;
        this.logicalTime.loopEnd = loopEnd ?? this.audioBuffer.duration;
        this.logicalTime.duration = this.audioBuffer.duration;

        this.reconnect();
    }

    static play(): Promise<void> {
        this.checkInit();

        return this.context.resume();
    }

    static pause(): Promise<void> {
        this.checkInit();
        return this.context.suspend();
    }

    /**
     * second秒かけてフェードアウトした後、止める
     * @param second 秒
     * @returns
     */
    static async fadeOut(second: number): Promise<void> {
        this.checkInit();

        await this.fade(0.001, second);
        await this.pause();
    }

    /**
     * play開始した後、second秒かけてフェードインする
     * @param second 秒
     * @returns
     */
    static async fadeIn(second: number): Promise<void> {
        this.checkInit();

        const volume = this.volume;
        this.setVolume(0.001);
        await this.play();
        await this.fade(volume, second);
    }

    /**
     * second秒かけてフェードする
     * @param volume 目標ボリューム
     * @param second 秒
     * @returns
     */
    static fade(volume: number, second: number): Promise<void> {
        this.checkInit();

        this.gain.gain.cancelScheduledValues(0);
        this.gain.gain.linearRampToValueAtTime(volume * this.sourceVolume, this.context.currentTime + second);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve();
            }, second * 1000);
        });
    }

    /**
     * 再生方向を切り替える
     */
    static reverse(): void {
        this.checkInit();

        this.logicalTime.isReversed = !this.logicalTime.isReversed;
        this.reconnect();
    }

    static setCurrentTime(second: number) {
        this.checkInit();

        this.logicalTime.setCurrentTime(this.context.currentTime, second);
        this.reconnect();
    }

    static getCurrentTime(): number {
        this.checkInit();

        this.logicalTime.updateCurrentTime(this.context.currentTime);
        return this.logicalTime.currentTime;
    }

    static isPlaying(): boolean {
        this.checkInit();
        return this.context.state === "running";
    }

    static setVolume(volume: number): void {
        this.checkInit();

        this.gain.gain.cancelScheduledValues(0);

        this.volume = volume;
        this.gain.gain.value = this.volume * this.sourceVolume;
    }

    // AudioBufferを反転させる（逆再生用）
    private static reverseBuffer(buffer: AudioBuffer) {
        const reversedBuffer = this.context.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const originalData = buffer.getChannelData(channel);
            const reversedData = reversedBuffer.getChannelData(channel);
            for (let i = 0; i < originalData.length; i++) {
                reversedData[i] = originalData[originalData.length - i - 1];
            }
        }

        return reversedBuffer;
    }

    private static reconnect() {
        this.checkInit();

        if (this.audio) {
            this.audio.stop();
            this.audio.disconnect();
            this.onEnded.cancel();
        }

        this.audio = this.context.createBufferSource();
        this.audio.loop = true;
        this.audio.buffer = this.logicalTime.isReversed ? this.reversedBuffer : this.audioBuffer;
        [this.audio.loopStart, this.audio.loopEnd] = this.logicalTime.getActualLoopTime();
        this.audio.connect(this.gain);

        this.onEnded.promise = new Promise((resolve) => {
            this.onEnded.cancel = resolve;
            this.audio.onended = () => {
                resolve();
            };
        });

        // 現在の論理時間を更新
        this.logicalTime.updateCurrentTime(this.context.currentTime);
        this.audio.start(0, this.logicalTime.getActualOffset());
    }

    private static checkInit() {
        if (!this.context) {
            throw new Error("BGM is not initialized. Call BGM.init() before using BGM.");
        }
    }
}

namespace BGM {
    export class Time {
        static currentTime = 0;
        static lastUpdateTime = 0;
        static lastUpdateContextTime = 0;

        static loopStart = 0;
        static loopEnd = 0;
        static duration = 0;

        static isReversed = false;

        static setCurrentTime(contextTime: number, currentTime: number) {
            currentTime = this.bound(currentTime);

            this.currentTime = currentTime;
            this.lastUpdateTime = currentTime;
            this.lastUpdateContextTime = contextTime;
        }

        static getActualOffset() {
            if (this.isReversed) {
                // 逆再生の場合、論理時間を反転させる
                return this.duration - this.currentTime;
            } else {
                // 通常再生の場合
                return this.currentTime;
            }
        }

        static getActualLoopTime(): [number, number] {
            if (this.isReversed) {
                return [this.duration - this.loopEnd, this.duration - this.loopStart];
            } else {
                return [this.loopStart, this.loopEnd];
            }
        }

        static updateCurrentTime(contextTime: number) {
            // 必ず0以上
            const elapsedContextTime = contextTime - this.lastUpdateContextTime;

            if (this.isReversed) {
                // 逆再生の場合、時間が逆向きに進む
                this.currentTime = this.lastUpdateTime - elapsedContextTime;
            } else {
                // 通常再生の場合
                this.currentTime = this.lastUpdateTime + elapsedContextTime;
            }

            this.currentTime = this.bound(this.currentTime);

            this.lastUpdateTime = this.currentTime;
            this.lastUpdateContextTime = contextTime;
        }

        // ループ範囲内に収める
        private static bound(currentTime: number) {
            const loopDuration = this.loopEnd - this.loopStart;

            // ループ範囲外へ向かおうとするときだけ修正する
            // ループ範囲外から範囲内へ向かっているときは修正しない
            if (this.isReversed && currentTime < this.loopStart) {
                return this.loopEnd - ((this.loopStart - currentTime) % loopDuration);
            }

            if (!this.isReversed && currentTime > this.loopEnd) {
                return this.loopStart + ((currentTime - this.loopStart) % loopDuration);
            }

            return currentTime;
        }
    }
}
