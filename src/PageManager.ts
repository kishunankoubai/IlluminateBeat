class PageManager {
    private static currentPage: HTMLElement | null = null;
    private static pageMemory: string[] = [];
    private static musicIndex = 0;
    private static gameManager: GameManager | null = null;
    private static musicData: any;
    static masterAdjustment: number = 0;
    private static on: { [key: string]: Function } = {
        setPage: () => {},
        backPages: () => {},
        play: () => {},
    };

    static async init() {
        const initialPageId = document.body.dataset.initialPage || "title";
        if (initialPageId) {
            this.setPage(initialPageId);
        }

        document.querySelectorAll("[data-se]").forEach((button) => {
            button.addEventListener("click", () => {
                const data = (button as HTMLElement).dataset.se;
                if (!data || data == "none") {
                    return;
                }
                const index = parseInt(data);
                SE.pause(index, true);
                SE.play(index);
            });
        });

        document.querySelectorAll("[data-page]").forEach((button) => {
            button.addEventListener("click", async () => {
                const pageId = (button as HTMLElement).dataset.page;
                if (pageId) {
                    if (button.classList.contains("musicOption")) {
                        this.musicIndex = parseInt((button as HTMLElement).dataset.index || "0");
                    }
                    await this.setPage(pageId);
                }
            });
        });

        document.querySelectorAll(".returnButton, [data-back]").forEach((returnButton) => {
            returnButton.addEventListener("click", async () => {
                const back = parseInt((returnButton as HTMLElement).dataset.back || "1");
                await this.backPages(back);
                if ((returnButton as HTMLElement).dataset.se == "none") {
                    return;
                }
            });
        });

        document.querySelectorAll(".myOption").forEach((button) => {
            button.addEventListener("click", () => {
                if ((button as HTMLElement).dataset.se == "none") {
                    return;
                }
                if (SE.isPlaying(1)) {
                    SE.pause(1, true);
                }
                SE.play(1);
            });
        });

        document.querySelectorAll(".returnButton").forEach((returnButton) => {
            returnButton.addEventListener("click", () => {
                if ((returnButton as HTMLElement).dataset.se == "none") {
                    return;
                }
                if (SE.isPlaying(2)) {
                    SE.pause(2, true);
                }
                SE.play(2);
            });
        });

        document.querySelectorAll("select").forEach((select) => {
            select.addEventListener("change", () => {
                const id = select.id;
                if (id == "bgmVolumeSelector") {
                    BGM.setVolume(parseFloat(select.value));
                } else if (id == "seVolumeSelector") {
                    SE.masterVolume = parseFloat(select.value);
                } else if (id == "timingSelector") {
                    this.masterAdjustment = parseInt(select.value);
                }
            });
        });

        this.musicData = await (await fetch("assets/musicData.json")).json();
    }

    static async setPage(pageId: string) {
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
        } else if (pageId != "pageStart") {
            if (BGM.isPlaying()) {
                await BGM.pause();
            }
        }
        if (pageId == "play") {
            this.on.play();
            dustAnimation.setVisible(true);
            await this.start();
        } else {
            dustAnimation.setVisible(false);
        }
    }

    static async backPages(number: number) {
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

    static setValid(valid: boolean): void {
        const invalidPanel = document.getElementById("invalidPanel");
        if (invalidPanel) {
            this.currentPage!.style.display = valid ? "flex" : "none";
            invalidPanel.style.display = valid ? "none" : "flex";
            invalidPanel.style.zIndex = valid ? "-1" : "100";
        }
    }

    static async start() {
        this.setValid(false);
        const musicData = this.musicData[this.musicIndex];
        BGM.setCurrentTime(0);
        //midiの読み込み
        const midiReader = new MIDIReader("assets/musics/" + musicData.name + ".mid", musicData);
        await midiReader.isReady;
        //音がすぐに鳴るおまじない
        SE.setVolume(0, 0);
        await SE.play(0);
        SE.pause(0);
        SE.setVolume(0, 0.5);
        //難易度設定の読み込み
        const selector = document.getElementById("difficultySelector") as HTMLSelectElement;
        const difficulty = parseInt(selector.value);
        console.log("difficulty:" + difficulty);
        //gameManagerの作成
        this.gameManager = new GameManager(midiReader, musicData, difficulty);
        this.gameManager.start();
        this.setValid(true);
    }

    static setOnProperty(property: { [key: string]: Function }) {
        for (const event in this.on) {
            if (property[event] != null) {
                this.on[event] = property[event];
            }
        }
    }
}
