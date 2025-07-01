"use strict";
class NoteElement {
    element;
    note;
    constructor(note) {
        this.element = document.createElement("div");
        this.element.classList.add("note");
        this.note = note;
    }
    get startTick() {
        return this.note.start;
    }
}
