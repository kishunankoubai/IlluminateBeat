class NoteElement {
    element: HTMLElement;
    note: Note;
    constructor(note: Note) {
        this.element = document.createElement("div");
        this.element.classList.add("note");
        this.note = note;
    }
    get startTick() {
        return this.note.start;
    }
}
