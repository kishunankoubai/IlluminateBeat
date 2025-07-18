const difficultySetting = [
    {
        maxLight: Infinity,
        maxFailedLevel: 1,
        recoveryCombo: 1,
        graceRate: 4,
        displayTick: 1920,
        level: 0,
    },
    {
        maxLight: 16,
        maxFailedLevel: 8,
        recoveryCombo: 1,
        graceRate: 4,
        displayTick: 1920,
        level: 1,
    },
    {
        maxLight: 12,
        maxFailedLevel: 4,
        recoveryCombo: 2,
        graceRate: 5,
        displayTick: 1440,
        level: 2,
    },
    {
        maxLight: 8,
        maxFailedLevel: 2,
        recoveryCombo: 4,
        graceRate: 6,
        displayTick: 960,
        level: 3,
    },
    {
        maxLight: 4,
        maxFailedLevel: 0,
        recoveryCombo: 0,
        graceRate: 10,
        displayTick: 960,
        level: 5,
    },
];

const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: "interactive" });

class GameManager {
    playPage = document.getElementById("play")!;
    circle = document.getElementById("circle")!;
    effectCircle = document.getElementById("effectCircle")!;
    judgementCircle = document.getElementById("judgementCircle")!;
    result = document.getElementById("resultText")!;
    scoreLabel = document.getElementById("scoreLabel")!;
    comboLabel = document.getElementById("comboLabel")!;
    progressBar = document.getElementById("playProgressBar")!;
    pausePage = document.getElementById("pause")!;
    notePage = document.getElementById("notePage")!;
    touchPage = document.getElementById("touchPage")!;
    midiReader: MIDIReader;
    musicData: any;
    difficulty: number = 0;
    delayBeat: number = 4;
    circleScale: number = 1.3;
    effectCircleScale: number = 2;

    rgb = [235, 208, 163];
    // rgb = [233, 205, 144];

    loopInterval: InterruptibleInterval;
    keyboardManager: KeyboardManager = new KeyboardManager();
    gamepadManager: GamepadManager = new GamepadManager();

    //labelの跳ねる表示
    settingHeight = 12;
    previousHeight = 0;

    //noteの表示
    noteElements: NoteElement[] = [];
    noteDisplayTick: number = 960;

    //beat判定
    beatKeys: string[] = ["Space", "KeyB", "KeyV", "KeyN", "Enter"] as const;
    beatKeyupFlag: boolean = true;
    beatFlag: boolean = false;
    previousBeat: number = 0;
    successBeatCount: number = 0;
    failedBeatCount: number = 0;

    //melody判定
    melodyKeys: string[] = ["KeyA", "KeyS", "KeyD", "KeyZ", "KeyX", "KeyC", "KeyM", "KeyK", "KeyL", "ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown", "Comma", "Period", "Slash"] as const;
    previousMelodyKeys: Set<string> = new Set();
    previousNote: Note = { start: 0, startTime: 0, pitch: 0, succeeded: true };
    melodyCount: number = 0;
    melodyKeyupFlag: boolean = true;

    //ゲーム情報
    readonly graceTick: number;
    adjustment: number = 150;
    startTick: number = 0;
    score: number = 0;
    beatCombo: number = 0;
    melodyCombo: number = 0;
    clearFlag: boolean = false;
    autoPlay: boolean = false;

    //描画処理設定
    displayMelodyGap: boolean = false;
    mobileMode: boolean = false;
    simplifyEffects: boolean = false;

    //難易度に影響されるゲーム情報
    maxLight: number = 8;
    light: number = this.maxLight;
    maxFailedLevel: number = 2;
    failedLevel: number = 0;
    recoveryCombo: number = 2;
    graceRate: number = 6;

    //効果音
    melodyBuffer: AudioBuffer | null = null;
    beatBuffer: AudioBuffer | null = null;
    playMelodySE: Function;
    playBeatSE: Function;
    isPlayingSE: boolean = false;

    //タッチ処理
    leftTouchstart: boolean = false;
    rightTouchstart: boolean = false;
    dominantHandIsRight: boolean = true;

    //統計
    melodyDifferences: number[] = [];
    frameCheckTime: number = 0;
    frameCount: number = 0;

    constructor(midiReader: MIDIReader, musicData: any, difficulty: number) {
        //オートプレイ設定の読み込み
        if ((document.getElementById("autoPlaySelector") as HTMLSelectElement).value != "0") {
            this.autoPlay = true;
        }
        //play中SE設定の読み込み
        if ((document.getElementById("playSeSelector") as HTMLSelectElement).value != "0") {
            this.isPlayingSE = true;
        }
        //melodyのずれの表示設定の読み込み
        if ((document.getElementById("melodyGapSelector") as HTMLSelectElement).value != "0") {
            this.displayMelodyGap = true;
        }
        //利き手設定の読み込み
        if ((document.getElementById("dominantHandSelector") as HTMLSelectElement).value != "0") {
            this.dominantHandIsRight = false;
        }

        //PCじゃないかどうか
        this.mobileMode = document.body.clientWidth <= 768;
        this.simplifyEffects = this.mobileMode;

        //曲情報の読み込み
        this.midiReader = midiReader;
        this.adjustment = this.autoPlay || this.isPlayingSE ? 0 : musicData.adjustment + PageManager.masterAdjustment + (this.mobileMode ? -60 : 0);
        // this.adjustment = 0;
        console.log("adjustment : " + this.adjustment);
        this.delayBeat = musicData.delayBeat;

        //難易度設定の読み込み
        [this.maxLight, this.maxFailedLevel, this.recoveryCombo, this.graceRate, this.noteDisplayTick] = [
            difficultySetting[difficulty].maxLight,
            difficultySetting[difficulty].maxFailedLevel,
            difficultySetting[difficulty].recoveryCombo,
            difficultySetting[difficulty].graceRate,
            difficultySetting[difficulty].displayTick,
        ];
        this.difficulty = difficulty;
        this.light = this.maxLight;
        this.graceTick = this.midiReader.resolution / this.graceRate;
        if (difficulty == 4) {
            this.rgb = [233, 190, 144];
        }

        //DOM要素の初期設定
        this.playPage.style.backgroundColor = `rgb(${this.rgb[0]}, ${this.rgb[1]}, ${this.rgb[2]})`;
        this.playPage.style.border = "none";
        this.circle.style.scale = 1 + "";
        this.circle.innerHTML = "";
        this.effectCircle.style.scale = this.circleScale * this.effectCircleScale + "";
        this.effectCircle.style.opacity = 0 + "";
        this.judgementCircle.style.scale = this.circleScale * 0.95 + "";
        this.judgementCircle.style.borderColor = `rgb(118, 101, 35)`;
        this.notePage.style.display = "flex";
        this.touchPage.style.display = "flex";
        this.scoreLabel.style.color = `rgb(118, 101, 35)`;
        this.comboLabel.style.color = `rgb(118, 101, 35)`;

        // 事前にデコード済みAudioBufferSourceNodeをプールしておき、即時再生する
        fetch("assets/SE/鈴を鳴らす.wav")
            .then((response) => response.arrayBuffer())
            .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
            .then((audioBuffer) => {
                this.melodyBuffer = audioBuffer;
            });
        fetch("assets/SE/モンド設置音.m4a")
            .then((response) => response.arrayBuffer())
            .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
            .then((audioBuffer) => {
                this.beatBuffer = audioBuffer;
            });

        this.playMelodySE = () => {
            if (!this.melodyBuffer) return;
            // AudioBufferSourceNodeは1回しか使えないので毎回新規作成
            const source = audioContext.createBufferSource();
            source.buffer = this.melodyBuffer;
            source.connect(audioContext.destination);
            source.start(audioContext.currentTime + 0.001);
        };

        this.playBeatSE = () => {
            if (!this.beatBuffer) return;
            // AudioBufferSourceNodeは1回しか使えないので毎回新規作成
            const source = audioContext.createBufferSource();
            source.buffer = this.beatBuffer;
            source.connect(audioContext.destination);
            source.start(audioContext.currentTime + 0.001);
        };

        //Pを押すとポーズ
        this.keyboardManager.onKeydown = async () => {
            if (this.keyboardManager.existsPressingKey(["KeyP", "Escape"])) {
                if (this.loopInterval.isPausing()) {
                    this.resume();
                } else {
                    this.pause();
                }
            }
            if (this.isPlayingSE) {
                if (this.melodyKeys.includes(this.keyboardManager.getLatestPressingKey(this.melodyKeys.concat(this.beatKeys)))) {
                    this.playMelodySE();
                }
                if (this.beatKeys.includes(this.keyboardManager.getLatestPressingKey(this.beatKeys.concat(this.melodyKeys)))) {
                    this.playBeatSE();
                }
            }
        };

        //ポーズ画面の挙動
        const clickHandler = (button: HTMLElement) => {
            const index = parseInt(button.dataset.index!);
            if (index == 0) {
                this.resume();
            } else {
                this.keyboardManager.stop();
                this.pausePage.style.display = "none";
                this.touchPage.style.display = "none";
                this.removeAllNotes();
            }

            if (index == 1) {
                PageManager.backPages(1);
                PageManager.setPage("play");
            }
        };

        document.querySelectorAll(".pauseOption").forEach((button) => {
            (button as HTMLElement).onclick = () => {
                clickHandler(button as HTMLElement);
            };
        });

        (document.getElementsByClassName("leftTouchPanel")[0] as HTMLElement).ontouchstart = (e) => {
            this.leftTouchstart = true;
            e.preventDefault();
        };

        (document.getElementsByClassName("rightTouchPanel")[0] as HTMLElement).ontouchstart = (e) => {
            this.rightTouchstart = true;
            e.preventDefault();
        };

        //開始処理
        this.loopInterval = new InterruptibleInterval(this.loop.bind(this));
        this.loopInterval.setDelay(this.simplifyEffects ? 1000 / 30 : 1);
    }

    async start() {
        this.keyboardManager.start();
        this.loopInterval.start();
        this.frameCheckTime = Date.now();
    }

    loop() {
        this.gamepadManager.updateGamepadInformation();

        //beatの立ち上がり検知
        let pressBeat;
        if (this.beatKeyupFlag) {
            pressBeat = this.keyboardManager.existsPressingKey(this.beatKeys) || this.gamepadManager.isButtonPressed(0, 6);
        } else {
            pressBeat = false;
        }
        this.beatKeyupFlag = !(this.keyboardManager.existsPressingKey(this.beatKeys) || this.gamepadManager.isButtonPressed(0, 6));
        if (this.leftTouchstart && this.dominantHandIsRight) {
            pressBeat = true;
            this.leftTouchstart = false;
        }
        if (this.rightTouchstart && !this.dominantHandIsRight) {
            pressBeat = true;
            this.rightTouchstart = false;
        }

        const nearestBeat = this.getNearestBeat();
        const nowTick = this.getTick();
        const tickGap = nowTick - nearestBeat;

        if (!this.autoPlay) {
            //すでにbeatしている時に押すと失敗
            if (this.beatFlag) {
                if (pressBeat) {
                    if (this.beatFail()) {
                        return;
                    }
                }
                //beatすることなく前回のbeatから2個後の判定区分内になったら失敗
            } else if (this.previousBeat + this.midiReader.resolution < nearestBeat) {
                if (this.beatFail()) {
                    return;
                }
                this.previousBeat = nearestBeat - this.midiReader.resolution;
                //猶予tick以内にbeatできたら成功
            } else if (Math.abs(tickGap) <= this.graceTick && pressBeat) {
                this.previousBeat = nearestBeat;
                this.beatSuccess();
                console.log("beat:" + tickGap);
                //猶予tick以外のbeatは失敗
            } else if (pressBeat) {
                if (this.beatFail()) {
                    return;
                }
                this.previousBeat = nearestBeat;
            }
        }

        //beatの判定区分が変わったらbeatFlagをfalseに
        if (this.previousBeat < nearestBeat) {
            this.beatFlag = false;
        }
        this.scoreLabel.style.transform = `translateY(${-this.previousHeight * 0.9}px)`;
        this.comboLabel.style.transform = `translateY(${-this.previousHeight * 0.9}px)`;
        this.previousHeight *= 0.9;

        //猶予tickの後半では枠線を表示
        if (0 <= tickGap && tickGap <= this.graceTick) {
            //beatの判定の真ん中だけ検出
            if (this.playPage.style.border == "none") {
                if (nearestBeat < this.delayBeat * this.midiReader.resolution) {
                    SE.play(0);
                }
                if (this.autoPlay) {
                    this.beatSuccess();
                    this.playBeatSE();
                    console.log("beat:" + tickGap);
                }
            }
            if (nearestBeat < this.delayBeat * this.midiReader.resolution) {
                this.circle.innerHTML = this.delayBeat - nearestBeat / this.midiReader.resolution + "";
            } else if (this.melodyCount == 0 || (this.circle.innerHTML != "" && !this.displayMelodyGap)) {
                this.circle.innerHTML = "";
            }
            if (this.simplifyEffects) {
                this.playPage.style.border = "4vh rgb(118, 101, 35) double";
            }
            //枠線などをランダムな色に
            if (!this.simplifyEffects) {
                const seed = tickGap * 1.5;
                const randomColor = [Math.floor(((seed * 3) % 256) + 200) / 2, Math.floor(((seed * 2) % 256) + 200) / 2, Math.floor(((seed * 1) % 256) + 200) / 2];
                this.playPage.style.border = `4vh rgb(${randomColor[0]}, ${randomColor[1]}, ${randomColor[2]}) double`;
                this.scoreLabel.style.color = `rgb(${randomColor[0]}, ${randomColor[1]}, ${randomColor[2]})`;
                this.comboLabel.style.color = `rgb(${randomColor[0]}, ${randomColor[1]}, ${randomColor[2]})`;
                this.judgementCircle.style.borderColor = `rgb(${randomColor[0]}, ${randomColor[1]}, ${randomColor[2]})`;
            }
        } else {
            this.playPage.style.border = "none";
            if (!this.simplifyEffects) {
                this.scoreLabel.style.color = `rgb(118, 101, 35)`;
                this.comboLabel.style.color = `rgb(118, 101, 35)`;
                this.judgementCircle.style.borderColor = `rgb(118, 101, 35)`;
            }
        }

        //melodyの立ち上がりを検知
        let pressMelody = false;
        const latestMelodyKeys = new Set(this.keyboardManager.getAllPressingKeys(this.melodyKeys));
        if (latestMelodyKeys.size != 0 && !latestMelodyKeys.isSubsetOf(this.previousMelodyKeys)) {
            pressMelody = true;
        }
        this.previousMelodyKeys = latestMelodyKeys;

        if (this.melodyKeyupFlag) {
            pressMelody = pressMelody || this.gamepadManager.isButtonPressed(0, 1);
        } else {
            pressMelody = false;
        }
        this.melodyKeyupFlag = !this.gamepadManager.isButtonPressed(0, 1);

        if (this.rightTouchstart && this.dominantHandIsRight) {
            pressMelody = true;
            this.rightTouchstart = false;
        }
        if (this.leftTouchstart && !this.dominantHandIsRight) {
            pressMelody = true;
            this.leftTouchstart = false;
        }

        if (this.autoPlay) {
            pressMelody = false;
        }

        const nearestNote = this.getNearestNote();
        const noteGap = nowTick - nearestNote.start;

        //すでに判定がなされているnoteについては何もしない
        if (nearestNote.succeeded != null) {
            //現在の判定区分のnoteが猶予tick以内にmelodyできたら成功
        } else if ((Math.abs(noteGap) <= this.graceTick && !this.autoPlay) || (this.autoPlay && 0 <= noteGap && noteGap <= this.graceTick)) {
            if (pressMelody || this.autoPlay) {
                this.score++;
                nearestNote.succeeded = true;
                this.circle.style.backgroundColor = "#5599ff";
                this.melodyCount++;
                this.melodyCombo++;
                if (this.autoPlay) {
                    this.playMelodySE();
                }
                this.effectCircle.style.scale = this.circleScale * this.getLightRate() + "";
                this.effectCircle.style.opacity = 1 + "";
                if (this.recoveryCombo <= this.melodyCombo) {
                    this.failedLevel--;
                }
                console.log("melody:" + noteGap);
                this.melodyDifferences.push(noteGap);
            }
            //現在の判定区分のnoteに猶予tick以外でmelodyしたら失敗
        } else if (Math.abs(noteGap) < this.midiReader.resolution / 2) {
            if (pressMelody) {
                nearestNote.succeeded = false;
                this.circle.style.backgroundColor = "#ff7766";
                this.melodyCombo = 0;
                this.failedLevel++;
            }
        }

        if (this.displayMelodyGap && pressMelody) {
            this.circle.innerHTML = Math.round(noteGap) + "";
        }

        //noteの判定区分が変わるとき、前回のnoteが未判定なら失敗
        if (this.previousNote != nearestNote) {
            if (this.previousNote.succeeded == null) {
                this.previousNote.succeeded = false;
                this.melodyCombo = 0;
                this.failedLevel++;
                this.circle.style.backgroundColor = "gray";
            } else {
                this.circle.style.backgroundColor = this.autoPlay ? "#eeff88" : "whitesmoke";
            }
        }
        this.previousNote = nearestNote;

        //判定区分をある程度過ぎたらcircleの色を戻す
        if (noteGap > this.midiReader.resolution / 2 && this.circle.style.backgroundColor != "gray") {
            this.circle.style.backgroundColor = this.autoPlay ? "#eeff88" : "whitesmoke";
        }

        //melodyを失敗しすぎたらlightを下げる
        if (this.failedLevel > this.maxFailedLevel) {
            if (0 < this.light) {
                this.light--;
            }
            this.updateLight();
            if (this.light == 0) {
                this.gameOver();
                return;
            }
            this.failedLevel = this.maxFailedLevel;
        } else if (this.failedLevel < 0) {
            this.failedLevel = 0;
        }

        //猶予tickの後半からcircleを大きく表示し、そこから減衰するようにする
        if (pressMelody) {
            this.circle.style.scale = this.circleScale * this.getLightRate() * 1.02 + "";
        }
        this.circle.style.scale = (parseFloat(this.circle.style.scale) * (this.simplifyEffects ? 3 : 8) + this.getLightRate()) / (this.simplifyEffects ? 4 : 9) + "";
        this.effectCircle.style.scale =
            (parseFloat(this.effectCircle.style.scale) * (this.simplifyEffects ? 3 : 8) + this.getLightRate() * this.circleScale * this.effectCircleScale) / (this.simplifyEffects ? 4 : 9) + "";
        this.effectCircle.style.opacity = (1 - (parseFloat(this.effectCircle.style.scale) / (this.getLightRate() * this.circleScale * this.effectCircleScale)) ** 1.2) * 0.8 + "";
        this.judgementCircle.style.scale = (0.95 * this.circleScale * parseFloat(this.judgementCircle.style.scale) + this.getLightRate()) / 2 + "";

        //scoreとcomboの表示情報の更新
        this.scoreLabel.innerHTML = "Score : " + this.score;
        this.comboLabel.innerHTML = "Combo : " + this.melodyCombo;

        //progressBarの更新
        const bgmCurrentTime = BGM.getCurrentTime();
        this.progressBar.style.width = this.clearFlag ? "100" : (bgmCurrentTime / BGM.Time.duration) * 100 + "%";

        //noteの更新
        this.updateNotes();

        //delayBeatだけ待ってから再生を開始する
        const currentTime = Math.max((this.loopInterval.getElapsedTime() + this.adjustment) / 1000 - (60 * this.delayBeat) / this.midiReader.tempo, 0);
        if (currentTime > 0 && nearestBeat >= this.delayBeat * this.midiReader.resolution) {
            if (!BGM.isPlaying()) {
                BGM.play();
            }
        } else {
            if (BGM.isPlaying()) {
                BGM.pause();
                BGM.setCurrentTime(0);
            }
        }

        // console.log(currentTime - bgmCurrentTime + "");
        //bgmとloopIntervalのずれを補正する
        if (Math.abs(currentTime - bgmCurrentTime) > 0.015) {
            BGM.setCurrentTime(currentTime);
            console.error("このメッセージがたくさん表示される場合は同期が不安定です");
        }

        //frameRateのチェック
        this.frameCount++;
        if (this.frameCheckTime <= Date.now() - 1000) {
            console.log("frameRate: " + this.frameCount);
            this.frameCheckTime = Date.now();
            this.frameCount = 0;
        }

        //次のループを開始していたらクリア
        if (bgmCurrentTime < 20 && currentTime - bgmCurrentTime > BGM.Time.loopEnd / 2) {
            this.clearFlag = true;
            this.gameOver();
            return;
        }
    }

    pause() {
        BGM.pause();
        this.loopInterval.pause();
        this.pausePage.style.display = "flex";
        this.notePage.style.display = "none";
        this.touchPage.style.display = "none";
    }

    resume() {
        this.loopInterval.resume();
        this.pausePage.style.display = "none";
        this.notePage.style.display = "flex";
        this.touchPage.style.display = "flex";
    }

    gameOver() {
        BGM.pause();
        this.loopInterval.pause();
        this.keyboardManager.stop();
        (document.querySelector(".resultOption[data-index='4']")! as HTMLElement).style.display = "none";
        if (this.clearFlag) {
            console.log("clear!");
            if (this.difficulty == 4 && this.midiReader.notes.length >= 200 && !this.autoPlay) {
                if (
                    Math.floor(((this.melodyCount + this.successBeatCount) * 100) / (this.getNumberOfJudgedNotes() + Math.floor(this.getTick() / this.midiReader.resolution - this.delayBeat + 1))) >=
                    50
                ) {
                    (document.querySelector(".resultOption[data-index='4']")! as HTMLElement).style.display = "block";
                }
            }
        } else {
            console.log("gameOver");
        }
        this.melodyDifferences.sort((a: number, b: number): number => {
            return a - b;
        });

        this.pausePage.style.display = "none";
        this.notePage.style.display = "none";
        this.touchPage.style.display = "none";
        this.removeAllNotes();
        this.result.innerHTML = `
        進行率：${this.clearFlag ? 100 : Math.floor((BGM.getCurrentTime() * 100) / BGM.Time.duration)}%<br />
        正確率：${Math.floor(
            ((this.melodyCount + this.successBeatCount) * 100) / (this.getNumberOfJudgedNotes() + Math.floor(this.getTick() / this.midiReader.resolution - this.delayBeat + 1))
        )}%<br />
        演奏の上手さ：${this.getPoint()} / ${100 * difficultySetting[this.difficulty].level}<br />
        Score：${this.score}<br />
        ずれの中央値：${(this.melodyDifferences[Math.floor(this.melodyDifferences.length / 2)] * 60000) / (this.midiReader.resolution * this.midiReader.tempo)}ms
        `;
        this.writeDetailedResult();
        PageManager.setPage("result");

        //統計情報
        let sumOfDifference = 0;
        this.melodyDifferences.forEach((difference) => {
            sumOfDifference += difference;
        });
        console.log("ずれの平均値:" + (sumOfDifference * 60000) / (this.melodyCount * this.midiReader.resolution * this.midiReader.tempo) + "ms");
        console.log("ずれの中央値:" + (this.melodyDifferences[Math.floor(this.melodyDifferences.length / 2)] * 60000) / (this.midiReader.resolution * this.midiReader.tempo) + "ms");
    }

    writeDetailedResult() {
        const detailedResult = document.getElementById("detailedResultText")!;
        detailedResult.innerHTML = `
        進行率：${this.clearFlag ? 100 : Math.floor((BGM.getCurrentTime() * 100) / BGM.Time.duration)}%<br />
        正確率：${Math.floor(
            ((this.melodyCount + this.successBeatCount) * 100) / (this.getNumberOfJudgedNotes() + Math.floor(this.getTick() / this.midiReader.resolution - this.delayBeat + 1))
        )}%<br />
        ビート正確率：${Math.floor((this.successBeatCount * 100) / Math.floor(this.getTick() / this.midiReader.resolution - this.delayBeat + 1))}%<br />
        成功したビート：${this.successBeatCount} / ${this.getNumberOfBeats()}<br />
        失敗したビート：${this.failedBeatCount}<br />
        メロディ正確率：${Math.floor((this.melodyCount * 100) / this.getNumberOfJudgedNotes())}%<br />
        成功したメロディ：${this.melodyCount} / ${this.midiReader.notes.length}<br />
        失敗したメロディ：${this.midiReader.notes.filter((note) => note.succeeded == false).length}<br />
        演奏の上手さ：${this.getPoint()} / ${100 * difficultySetting[this.difficulty].level}<br />
        Score：${this.score}<br />
        ${this.autoPlay ? "これはオートプレイです" : "レベル：" + this.difficulty}
        `;
    }

    getTick(): number {
        return Math.max((this.loopInterval.getElapsedTime() * this.midiReader.tempo * this.midiReader.resolution) / 60000, 0);
    }

    getNearestBeat(): number {
        return Math.round(this.getTick() / this.midiReader.resolution) * this.midiReader.resolution;
    }

    getNumberOfBeats() {
        return Math.floor((BGM.Time.duration * this.midiReader.tempo) / 60);
    }

    getNumberOfJudgedNotes() {
        return this.midiReader.notes.filter((note) => note.succeeded != null).length;
    }

    getLightRate() {
        return this.maxLight == Infinity ? 1 : this.light / this.maxLight;
    }

    beatFail() {
        if (this.getNearestBeat() <= this.midiReader.resolution * this.delayBeat) {
            return;
        }
        if (0 < this.light) {
            this.light--;
        }
        this.beatCombo = 0;
        this.failedBeatCount++;
        this.updateLight();
        if (this.light == 0) {
            this.gameOver();
            return true;
        }
        return false;
    }

    beatSuccess() {
        if (this.getNearestBeat() < this.midiReader.resolution * this.delayBeat) {
            return;
        }
        this.beatFlag = true;
        if (this.light < this.maxLight) {
            this.light++;
        }
        this.score++;
        this.beatCombo++;
        this.scoreLabel.style.transform = `translateY(${-this.settingHeight}px)`;
        this.comboLabel.style.transform = `translateY(${-this.settingHeight}px)`;
        this.previousHeight = this.settingHeight;
        this.updateLight();
        this.successBeatCount++;
    }

    updateLight() {
        const lightRate = this.getLightRate();
        this.playPage.style.backgroundColor = `rgb(${this.rgb[0] * lightRate}, ${this.rgb[1] * lightRate}, ${this.rgb[2] * lightRate})`;
    }

    getNearestNote(): Note {
        let minGap = Infinity;
        let nearestNote: Note = { start: -Infinity, startTime: -Infinity, pitch: 0, succeeded: true };
        for (const note of this.midiReader.notes) {
            const gap = Math.abs(this.getTick() - note.start);
            if (gap < minGap) {
                minGap = gap;
                nearestNote = note;
            } else {
                return nearestNote;
            }
        }
        return nearestNote;
    }

    updateNotes() {
        const nowTick = this.getTick();
        //noteDisplayTick以内に判定される判定前のnoteを追加されていないなら追加する
        this.midiReader.notes.forEach((note) => {
            if (nowTick <= note.start && note.start - nowTick < this.noteDisplayTick && !this.noteElements.map((noteElement) => noteElement.note).includes(note)) {
                this.noteElements.push(new NoteElement(note));
            }
        });
        this.noteElements.forEach((noteElement) => {
            const element = noteElement.element;
            //判定tickを過ぎたらnoteElementを削除する
            if (noteElement.startTick < nowTick) {
                element.remove();
            } else {
                //noteElementsのnoteをnotePageに追加されていないなら追加する
                if (![...this.notePage.children].includes(noteElement.element)) {
                    this.notePage.appendChild(noteElement.element);
                }
                //noteElementsのnoteの表示更新
                const rect = this.circle.getBoundingClientRect();
                const scale = this.circleScale * ((noteElement.startTick - nowTick) / (this.midiReader.resolution * (this.simplifyEffects ? 1.5 : 1)) + 1) * this.getLightRate();
                element.style.scale = "1";
                element.style.top = rect.top + rect.height / 2 - noteElement.element.getBoundingClientRect().height / 2 + "px";
                element.style.opacity = Math.min(this.midiReader.resolution / (noteElement.startTick - nowTick) / 2, 1) + "";
                element.style.scale = scale + "";
            }
        });
        //判定tickを過ぎたnoteElementを削除する
        this.noteElements = this.noteElements.filter((noteElement) => nowTick <= noteElement.startTick);
    }

    removeAllNotes() {
        this.noteElements.forEach((noteElement) => {
            noteElement.element.remove();
        });
        this.noteElements = [];
    }

    getPoint() {
        return Math.max(
            Math.floor(
                (((this.clearFlag ? BGM.Time.duration : BGM.getCurrentTime()) + this.melodyCount + this.successBeatCount) * 100 * difficultySetting[this.difficulty].level) /
                    (BGM.Time.duration + this.midiReader.notes.length + Math.floor(this.getTick() / this.midiReader.resolution - this.delayBeat + 1))
            ) * (this.autoPlay ? 0 : 1),
            0
        );
    }
}
