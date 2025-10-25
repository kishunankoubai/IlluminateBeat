"use strict";
class PageManager {
    static currentPage = null;
    static pageMemory = [];
    static musicIndex = 0;
    static gameManager = null;
    static musicData;
    static masterAdjustment = 0;
    static on = {
        setPage: () => { },
        backPages: () => { },
        play: () => { },
    };
    static async init() {
        const initialPageId = document.body.dataset.initialPage || "title";
        if (initialPageId) {
            this.setPage(initialPageId);
        }
        this.musicData = await (await fetch("assets/musicData.json")).json();
        const musicOptions = document.querySelector("#musicOptions");
        this.musicData.forEach((data, index) => {
            const musicOption = document.createElement("button");
            musicOption.classList.add("myOption", "musicOption");
            musicOption.dataset.index = index + "";
            musicOption.dataset.page = "preparingStart";
            const musicIllust = document.createElement("div");
            musicIllust.classList.add("musicIllust");
            if ("illust" in data) {
                musicIllust.style.background = `url(${data.illust})`;
                musicIllust.style.backgroundSize = "cover";
            }
            if ("backgroundColor" in data) {
                musicIllust.style.backgroundColor = data.backgroundColor;
            }
            musicOption.appendChild(musicIllust);
            if ("difficulty" in data) {
                const text = `No.${index + 1} 曲名 : ${data.name}<br />${data.description1}<br />${data.description2}<br />難易度 : ${data.difficulty}`;
                const textElement = document.createElement("div");
                textElement.classList.add("text");
                textElement.dataset.align = "left";
                textElement.innerHTML = text;
                musicOption.appendChild(textElement);
            }
            musicOptions.appendChild(musicOption);
        });
        document.querySelectorAll("[data-se]").forEach((button) => {
            button.addEventListener("click", () => {
                const data = button.dataset.se;
                if (!data || data == "none") {
                    return;
                }
                const index = parseInt(data);
                se[index].play();
            });
        });
        document.querySelectorAll("[data-page]").forEach((button) => {
            button.addEventListener("click", async () => {
                const pageId = button.dataset.page;
                if (pageId) {
                    if (button.classList.contains("musicOption")) {
                        this.musicIndex = parseInt(button.dataset.index || "0");
                    }
                    await this.setPage(pageId);
                }
            });
        });
        document.querySelectorAll(".returnButton, [data-back]").forEach((returnButton) => {
            returnButton.addEventListener("click", async () => {
                const back = parseInt(returnButton.dataset.back || "1");
                await this.backPages(back);
                if (returnButton.dataset.se == "none") {
                    return;
                }
            });
        });
        document.querySelectorAll(".myOption").forEach((button) => {
            button.addEventListener("click", () => {
                if (button.dataset.se == "none") {
                    return;
                }
                se[1].play();
            });
        });
        document.querySelectorAll(".returnButton").forEach((returnButton) => {
            returnButton.addEventListener("click", () => {
                if (returnButton.dataset.se == "none") {
                    return;
                }
                se[2].play();
            });
        });
        document.querySelectorAll("input").forEach((input) => {
            input.addEventListener("input", () => {
                const id = input.id;
                if (id == "bgmVolume") {
                    BGM.setVolume(parseFloat(input.value) / 10);
                    se[0].play();
                }
                else if (id == "seVolume") {
                    Sound.setWholeVolume(parseFloat(input.value) / 10);
                    se[0].play();
                }
                else if (id == "timingInput") {
                    this.masterAdjustment = parseInt(input.value);
                    document.querySelector("#timingDisplayLabel").innerHTML = "補正値：" + this.masterAdjustment + "ms";
                    se[0].play();
                }
            });
        });
        //検索
        document.querySelectorAll("#searchInput").forEach((element) => {
            element.addEventListener("search", () => {
                document.querySelectorAll(".musicOption").forEach((option) => {
                    Array.from(option.children).forEach((text) => {
                        if (text.classList.contains("text")) {
                            const displayFlag = element.value.split(/\s|\u3000/g).every((string) => {
                                return text.innerText.toLowerCase().includes(string.toLowerCase());
                            });
                            if (displayFlag) {
                                option.style.display = "";
                            }
                            else {
                                option.style.display = "none";
                            }
                        }
                    });
                });
            });
        });
    }
    static async setPage(pageId) {
        // 現在のページを非表示にする
        if (this.currentPage) {
            this.currentPage.style.display = "none";
        }
        // 新しいページを取得
        const nextPage = document.getElementById(pageId);
        if (!nextPage) {
            console.error(`Page with id "${pageId}" not found.`);
            return;
        }
        // 新しいページを表示
        nextPage.style.display = "flex";
        this.currentPage = nextPage;
        this.pageMemory.push(pageId);
        this.on.setPage();
        //特殊処理
        if (pageId == "preparingStart") {
            this.setValid(false);
            //musicの先行読み込み
            if (BGM.isPlaying()) {
                await BGM.pause();
            }
            await BGM.fetch({
                src: "assets/musics/" + this.musicData[this.musicIndex].name + "." + (this.musicData[this.musicIndex].musicType || "mp3"),
                sourceVolume: this.musicData[this.musicIndex].volume || 1,
            });
            BGM.setCurrentTime(0);
            await BGM.play();
            this.setValid(true);
        }
        else if (pageId != "pageStart") {
            if (BGM.isPlaying()) {
                await BGM.pause();
            }
        }
        if (pageId == "play") {
            this.on.play();
            dustAnimation.setVisible(true);
            await this.start();
        }
        else {
            dustAnimation.setVisible(false);
        }
    }
    static async backPages(number) {
        if (number == -1) {
            this.pageMemory = [];
            this.setPage("title");
        }
        if (this.pageMemory.length < number + 1 || number < -1) {
            console.log("ページ遷移の記録がないため戻ることはできません");
            return;
        }
        await this.setPage(this.pageMemory[this.pageMemory.length - number - 1]);
        this.pageMemory = this.pageMemory.slice(0, -number - 1);
    }
    static setValid(valid) {
        const invalidPanel = document.getElementById("invalidPanel");
        if (invalidPanel) {
            this.currentPage.style.display = valid ? "flex" : "none";
            invalidPanel.style.display = valid ? "none" : "flex";
            invalidPanel.style.zIndex = valid ? "-1" : "100";
        }
    }
    static async start() {
        if (window.visualViewport) {
            if (window.visualViewport.scale > 1) {
                alert("画面がズームされています。スタート前にズームを戻してください。");
                this.backPages(1);
                return;
            }
        }
        this.setValid(false);
        const musicData = this.musicData[this.musicIndex];
        BGM.setCurrentTime(0);
        //音がすぐに鳴るおまじない
        // se[3].play();
        //midiの読み込み
        const midiReader = new MIDIReader("assets/musics/" + musicData.name + ".mid", musicData);
        await midiReader.isReady;
        //難易度設定の読み込み
        const selector = document.getElementById("difficultySelector");
        const difficulty = parseInt(selector.value);
        console.log("difficulty:" + difficulty);
        //gameManagerの作成
        this.gameManager = new GameManager(midiReader, musicData, difficulty);
        this.gameManager.start();
        this.setValid(true);
    }
    static setOnProperty(property) {
        for (const event in this.on) {
            if (property[event] != null) {
                this.on[event] = property[event];
            }
        }
    }
}
