declare const PicoAudio: any;
const picoAudio = new PicoAudio();
picoAudio.init();
type Note = { start: number; startTime: number; pitch: number; succeeded: boolean | null };

class MIDIReader {
    notes: Note[] = [];
    resolution: number = 480;
    tempo: number = 120;
    isReady: Promise<void>;

    constructor(
        path: string,
        { melodyTrack, tempoTrack, startTick, delayBeat, measureLength }: { melodyTrack: number; tempoTrack: number; startTick: number; delayBeat: number; measureLength: number } = {
            melodyTrack: 0,
            tempoTrack: 0,
            startTick: 0,
            delayBeat: 0,
            measureLength: 1,
        }
    ) {
        this.isReady = this.readMIDIFile(path, { melodyTrack, tempoTrack, startTick, delayBeat, measureLength });
    }

    async readMIDIFile(
        path: string,
        { melodyTrack, tempoTrack, startTick, delayBeat, measureLength }: { melodyTrack: number; tempoTrack: number; startTick: number; delayBeat: number; measureLength: number } = {
            melodyTrack: 0,
            tempoTrack: 0,
            startTick: 0,
            delayBeat: 0,
            measureLength: 1,
        }
    ) {
        measureLength = measureLength ? measureLength : 1;
        const file = await fetch(path);
        const smfData = new Uint8Array(await file.arrayBuffer());
        const parsedData = picoAudio.parseSMF(smfData);
        this.notes = parsedData.channels[melodyTrack].notes.map(({ start, startTime, pitch }: any) =>
            Object.assign({ start: (start - startTick) / measureLength + this.resolution * delayBeat, startTime: startTime * measureLength, pitch, succeeded: null })
        );
        this.resolution = parsedData.header.resolution;
        this.tempo = parsedData.tempoTrack[tempoTrack].value / measureLength;
    }
}
