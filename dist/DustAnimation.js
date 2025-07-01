"use strict";
class DustAnimation {
    dustContainer = document.createElement("div");
    maxSpeed = 6;
    minSpeed = 10;
    constructor() {
        this.dustContainer.className = "dust-container";
    }
    get element() {
        return this.dustContainer;
    }
    addDust() {
        const dust = document.createElement("div");
        dust.className = "dust";
        dust.style.left = Math.random() * 100 + "%";
        dust.style.animationDuration = this.maxSpeed + Math.random() * (this.minSpeed - this.maxSpeed) + "s";
        dust.style.animationDelay = Math.random() * this.minSpeed + "s";
        this.dustContainer.appendChild(dust);
    }
    setVisible(visible) {
        if (visible) {
            this.dustContainer.style.display = "block";
        }
        else {
            this.dustContainer.style.display = "none";
        }
    }
    addDusts(number) {
        for (let i = 0; i < number; i++) {
            this.addDust();
        }
    }
}
const dustAnimation = new DustAnimation();
dustAnimation.addDusts(40);
dustAnimation.setVisible(false);
document.body.appendChild(dustAnimation.element);
