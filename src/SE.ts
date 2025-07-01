class SE {
    static audios: HTMLAudioElement[] = [];
    static masterVolume = 1;
    static relativeVolume: number[] = [];
    static #sources: MediaElementAudioSourceNode[] = [];
    static #contexts: AudioContext[] = [];
    static #gains: GainNode[] = [];

    static fetch(index: number, { path, volume = 1, loop = false }: { path: string; volume?: number; loop?: boolean }) {
        this.#contexts[index] = new AudioContext();
        this.#gains[index] = this.#contexts[index].createGain();
        this.#gains[index].connect(this.#contexts[index].destination);

        this.relativeVolume[index] = volume;
        const audio = new Audio(path);
        audio.loop = loop;
        audio.volume = volume * this.masterVolume;
        audio.preload = "auto";
        audio.autoplay = false;

        if (this.#sources[index]) this.#sources[index].disconnect();
        this.#sources[index] = this.#contexts[index].createMediaElementSource(audio);
        this.#sources[index].connect(this.#gains[index]);

        this.audios[index] = audio;

        return new Promise<void>((resolve) => {
            audio.oncanplay = () => {
                resolve();
            };
        });
    }

    static play(index: number) {
        console.assert(!!this.audios[index], "BGM.play: audio is not loaded");
        if (!this.audios[index]) return Promise.resolve();
        this.setVolume(index, this.relativeVolume[index]);
        return this.audios[index].play();
    }

    static pause(index: number, reset?: boolean) {
        console.assert(!!this.audios[index], "BGM.pause: audio is not loaded");
        if (!this.audios[index]) return;
        this.audios[index].pause();
        if (reset) {
            this.audios[index].currentTime = 0;
        }
    }

    static fade(index: number, value: number, ms: number) {
        if (!this.#gains[index]) return;

        this.setVolume(index, this.relativeVolume[index]);
        this.#gains[index].gain.cancelScheduledValues(0);
        this.#gains[index].gain.exponentialRampToValueAtTime(value + 0.001, this.#contexts[index].currentTime + ms / 1000);

        return new Promise((resolve) => {
            setTimeout(() => {
                if (value == 0) this.#gains[index].gain.value = 0;
                resolve(this);
            }, ms);
        });
    }

    static async fadeOut(index: number, ms: number) {
        console.assert(!!this.audios[index], "BGM.fadeOut: audio is not loaded");
        await this.fade(index, 0, ms);
        this.pause(index);
    }

    static setVolume(index: number, value: number) {
        if (!this.#gains[index]) return;
        this.relativeVolume[index] = value;
        this.#gains[index].gain.cancelScheduledValues(0);
        this.#gains[index].gain.value = value * this.masterVolume;
    }

    static isPlaying(index: number) {
        if (!this.audios[index]) return false;
        return !this.audios[index].paused;
    }
}
