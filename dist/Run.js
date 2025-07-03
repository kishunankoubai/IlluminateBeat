"use strict";
document.addEventListener("keydown", (e) => {
    if (e.code == "Tab") {
        e.preventDefault();
    }
});
document.addEventListener("DOMContentLoaded", async () => {
    await PageManager.init();
});
document.getElementById("pageStart").onclick = async () => {
    BGM.init();
    await sleep(100);
    await SE.fetch(0, { path: "assets/SE/モンド移動音.m4a" });
    SE.setVolume(0, 0.4);
    await SE.fetch(1, { path: "assets/SE/通常ボタン.m4a" });
    SE.setVolume(1, 0.4);
    await SE.fetch(2, { path: "assets/SE/戻るボタン.m4a" });
    SE.setVolume(2, 0.4);
};
document.getElementById("pageStart").ontouchend = () => {
    let buffer;
    fetch("assets/SE/通常ボタン.m4a")
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
        .then((audioBuffer) => {
        buffer = audioBuffer;
    });
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(audioContext.currentTime + 0.001);
};
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
function printDot(left, top, color) {
    const printDots = document.getElementsByClassName("printDot");
    if (printDots.length != 0) {
        [...printDots].forEach((element) => {
            element.remove();
        });
    }
    const dot = document.createElement("div");
    dot.className = "printDot";
    dot.style.width = "3px";
    dot.style.height = "3px";
    dot.style.position = "absolute";
    dot.style.top = top - 1 + "px";
    dot.style.left = left - 1 + "px";
    dot.style.backgroundColor = color || "#ff0000";
    let dotZIndex = 5;
    dot.style.zIndex = dotZIndex + "";
    document.body.appendChild(dot);
}
