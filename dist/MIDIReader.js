"use strict";
const picoAudio = new PicoAudio();
picoAudio.init();
class MIDIReader {
    notes = [];
    resolution = 480;
    tempo = 120;
    isReady;
    constructor(path, { melodyTrack, tempoTrack, startTick, delayBeat, measureLength } = {
        melodyTrack: 0,
        tempoTrack: 0,
        startTick: 0,
        delayBeat: 0,
        measureLength: 1,
    }) {
        this.isReady = this.readMIDIFile(path, { melodyTrack, tempoTrack, startTick, delayBeat, measureLength });
    }
    async readMIDIFile(path, { melodyTrack, tempoTrack, startTick, delayBeat, measureLength } = {
        melodyTrack: 0,
        tempoTrack: 0,
        startTick: 0,
        delayBeat: 0,
        measureLength: 1,
    }) {
        measureLength = measureLength ? measureLength : 1;
        const file = await fetch(path);
        const smfData = new Uint8Array(await file.arrayBuffer());
        const parsedData = picoAudio.parseSMF(smfData);
        this.notes = parsedData.channels[melodyTrack].notes.map(({ start, startTime, pitch }) => Object.assign({ start: (start - startTick) / measureLength + this.resolution * delayBeat, startTime: startTime * measureLength, pitch, succeeded: null }));
        this.resolution = parsedData.header.resolution;
        this.tempo = parsedData.tempoTrack[tempoTrack].value / measureLength;
    }
}
