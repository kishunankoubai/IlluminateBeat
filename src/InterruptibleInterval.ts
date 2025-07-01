class InterruptibleInterval {
    //実行する用の関数
    private handler: Function;
    //handlerを実行する遅延時間(ms)
    private delay: number = 1;
    //Timeoutの開始時刻
    private startTime: number = 0;
    //直前のpauseの実行時刻
    private pauseTime: number = 0;
    //pauseの合計時間(ms)
    private pauseSpan: number = 0;
    //経過時間をチェックする用のrequestAnimationFrame
    private checkRequest: number | null = null;
    //すでにstartしているならtrue
    private started: boolean = false;
    //pause中ならtrue
    private pausing: boolean = false;
    //checkを止める用のフラグ
    private stop: boolean = false;
    //前回の実行が何番目か
    private previousIndex: number = 0;

    //実行する関数を設定する
    constructor(handler: Function) {
        this.handler = handler;
    }

    //delayを設定する
    setDelay(delay: number): void {
        if (delay <= 0) {
            throw new Error("delayの値として不正な値が入力されました: " + delay);
        }
        if (this.started) {
            console.error("startしてからresetするまでの間はdelayを変更できません");
            return;
        }
        this.delay = delay;
    }

    //Intervalを開始する
    start(): void {
        this.reset();
        this.started = true;
        this.startTime = Date.now();
        this.check();
    }

    //Intervalの経過時間を取得する
    getElapsedTime(): number {
        if (this.pausing) {
            return this.pauseTime - this.startTime - this.pauseSpan;
        } else {
            return Date.now() - this.startTime - this.pauseSpan;
        }
    }

    //Intervalを一時中断する
    pause(): void {
        if (this.pausing || !this.started) {
            return;
        }
        if (this.checkRequest != null) {
            this.stop = true;
        }
        this.pauseTime = Date.now();
        this.pausing = true;
    }

    //pauseにより一時中断していた場合は再開する
    resume(): void {
        if (!this.pausing || !this.started) {
            return;
        }
        this.pauseSpan += Date.now() - this.pauseTime;
        this.pausing = false;
        this.check();
    }

    //delayとhandlerはそのままでstart前に戻す
    reset(): void {
        if (this.checkRequest != null) {
            this.stop = true;
        }
        this.startTime = 0;
        this.pauseTime = 0;
        this.pauseSpan = 0;
        this.previousIndex = 0;
        this.started = false;
        this.pausing = false;
    }

    //経過時間をチェックする
    check(): void {
        if (this.stop) {
            this.stop = false;
            this.checkRequest = null;
            return;
        }
        if (Math.floor(this.getElapsedTime() / this.delay) != this.previousIndex) {
            this.previousIndex = Math.floor(this.getElapsedTime() / this.delay);
            this.handler();
        }
        if (!this.stop) {
            this.checkRequest = requestAnimationFrame(() => {
                this.check();
            });
        } else {
            this.stop = false;
            this.checkRequest = null;
        }
    }

    //Intervalがすでにstartしている場合はtrueを返す
    isStarted(): boolean {
        return this.started;
    }

    //Intervalがpause中の場合はtrueを返す
    isPausing(): boolean {
        return this.pausing;
    }
}
