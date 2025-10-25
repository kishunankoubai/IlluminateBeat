"use strict";
//不正なページ遷移の防止
document.addEventListener("keydown", (e) => {
    if (e.code == "Tab" || e.code == "Enter") {
        e.preventDefault();
    }
});
document.querySelectorAll("button").forEach((button) => {
    button.tabIndex = -1;
});
let se = [];
let picoAudio;
document.addEventListener("DOMContentLoaded", async () => {
    BGM.init();
    Sound.init();
    await PageManager.init();
    PageManager.setValid(false);
    se = [
        new Sound({ src: "assets/SE/モンド移動音.m4a", volume: 0.4 }),
        new Sound({ src: "assets/SE/通常ボタン.m4a", volume: 0.4 }),
        new Sound({ src: "assets/SE/戻るボタン.m4a", volume: 0.4 }),
        new Sound({ src: "assets/SE/モンド移動音.m4a", volume: 0 }),
        new Sound({ src: "assets/SE/鈴を鳴らす.wav", volume: 0.4 }),
        new Sound({ src: "assets/SE/モンド設置音.m4a", volume: 0.4 }),
    ];
    await Promise.all(se.map((s) => s.isReady));
    PageManager.setValid(true);
});
document.getElementById("pageStart").onclick = async () => {
    se[1].play();
    picoAudio = new PicoAudio();
    await picoAudio.init();
    document.getElementById("pageStart").onclick = () => { };
};
// document.getElementById("pageStart")!.ontouchend = () => {};
//クリック以外の挙動をすべて握りつぶす
// document.querySelectorAll(".page").forEach((element) => {
//     if (element instanceof HTMLElement) {
//         element.ontouchstart = (e) => {
//             element.click();
//             e.preventDefault();
//         };
//     }
// });
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
