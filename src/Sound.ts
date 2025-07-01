class Sound {
    private static context: AudioContext
    /**
     * SE全体のボリューム
     */
    private static gain: GainNode
    /**
     * それぞれのSEのボリューム
     */
    private gain: GainNode

    private audioBuffer!: AudioBuffer
    private reversedBuffer!: AudioBuffer

    private isReversed = false

    private lastPlayTime = Date.now()

    readonly isReady

    private static initialized = false
    static init() {
        if (this.initialized) {
            throw new Error(
                "Sound is already initialized! Ensure that you are not calling Sound.init() multiple times.",
            )
        }
        this.initialized = true

        this.context = new AudioContext()
        this.gain = this.context.createGain()
        this.gain.connect(this.context.destination)
    }

    /**
     * SE全体のボリュームを設定
     * @param volume
     */
    static setWholeVolume(volume: number) {
        Sound.checkInit()
        this.gain.gain.value = volume
    }

    constructor({ src, volume = 0.4 }: { src: string; volume?: number }) {
        Sound.checkInit()

        this.gain = Sound.context.createGain()
        this.gain.connect(Sound.gain)
        this.gain.gain.value = volume

        this.isReady = this.fetch(src)
    }

    play() {
        // 連打はNG
        if (Date.now() - this.lastPlayTime < 32) {
            return
        }
        this.lastPlayTime = Date.now()

        this.reconnect()
    }

    // 再生方向を切り替える
    reverse() {
        this.isReversed = !this.isReversed
    }

    clearReversal() {
        this.isReversed = false
    }

    // 音源を読み込む
    private async fetch(src: string) {
        Sound.checkInit()

        const arrayBuffer = await (await fetch(src)).arrayBuffer()
        const audioBuffer = await Sound.context.decodeAudioData(arrayBuffer)

        this.audioBuffer = audioBuffer
        const reversedBuffer = this.reverseBuffer(this.audioBuffer)
        this.reversedBuffer = reversedBuffer
    }

    // AudioBufferを反転させる（逆再生用）
    private reverseBuffer(buffer: AudioBuffer) {
        Sound.checkInit()

        const reversedBuffer = Sound.context.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const originalData = buffer.getChannelData(channel)
            const reversedData = reversedBuffer.getChannelData(channel)
            for (let i = 0; i < originalData.length; i++) {
                reversedData[i] = originalData[originalData.length - i - 1]
            }
        }

        return reversedBuffer
    }

    // play前の処理
    private reconnect() {
        Sound.checkInit()

        const audio = Sound.context.createBufferSource()
        audio.buffer = this.isReversed ? this.reversedBuffer : this.audioBuffer
        audio.connect(this.gain)
        audio.start()
    }

    private static checkInit() {
        if (!this.context) {
            throw new Error("Sound is not initialized. Call Sound.init() before using Sound.")
        }
    }
}
