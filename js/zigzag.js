
var instances = {};
var currentInstance = null;

function clickPlayPause(id) {
    instances[id].clickPlayPause();
}

function clickFast(id) {
    instances[id].clickFast();
}

function clickStep(id) {
    instances[id].clickStep();
}

function clickReset(id) {
    instances[id].clickReset();
}

// TODO: mersenne twister
var seed = 3;
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function randBoolean(true_probability) {
    return Math.random() <= true_probability;
}

function randInt(n) {
    return getRandom(0, n);
}

function randDirection() {
    return randInt(4);
}

var UP = 0;
var DOWN = 1;
var LEFT = 2;
var RIGHT = 3;

var GRID_STROKE = "#ccc";

var Particle = function(direction) {
    this.direction = direction;
}

var ZigzagSim = function(args) {
    this.numRows = args.numRows;
    this.numCols = args.numCols;
    this.numParticles = args.numParticles;

    this.matrix = [];
    for (var r = 0; r < this.numRows; r++) {
        this.matrix.push([]);
        for (var c = 0; c < this.numCols; c++) {
            this.matrix[r].push(null);
        }
    }

    for (var i = 0; i < this.numParticles; i++) {
        var r;
        var c;
        //do {
            r = randInt(0, this.numRows);
            c = randInt(0, this.numCols);
        //} while (this.matrix[r][c] != null);

        var direction = randDirection();

        var p = new Particle(direction);
        this.matrix[r][c] = p;
    }
};

var ZigzagViz = function(args) {
    this.simId = args.simId;
    this.canvasId = this.simId + "-canvas";
    this.width = args.width;
    this.height = args.height;
    this.numRows = args.numRows;
    this.numCols = args.numCols;
    this.cellWidth = this.width / this.numCols;
    this.cellHeight = this.height / this.numRows;

    this.canvas = this.addCanvas();
    this.stage = this.addStage();

    this.drawGrid();

    this.stage.update();

}

function retina(value) {
    return value * window.devicePixelRatio;
}

ZigzagViz.prototype.addStage = function() {
    var stage = new createjs.Stage(this.canvasId);
    stage.regX = -0.5;
    stage.regY = -0.5;
    stage.enableMouseOver();
    return stage;
};

ZigzagViz.prototype.addCanvas = function() {


    var width = this.width; //Math.round(retina(this.width));
    var height = this.height; //Math.round(retina(this.height));

    var canvasHtml = `
      <div class="window">
        <canvas id="${this.canvasId}"
                class="zz-canvas"
                width="${width}"
                height="${height}">
      </div>`;

    $("#" + this.simId).html(canvasHtml);

    var canvas = jQuery("#" + this.simId + " .window canvas");

    // From http://www.unfocus.com/2014/03/03/hidpiretina-for-createjs-flash-pro-html5-canvas/
    //val height = canvas.attr("height").toOption.map{ h => h.toInt}.getOrElse(0)
    //val width = canvas.attr("width").toOption.map{ w => w.toInt}.getOrElse(0)

    // Reset the canvas width and height with window.devicePixelRatio applied
    canvas.attr("width", Math.round(retina(width)));
    canvas.attr("height", Math.round(retina(height)));

    // Force the canvas back to the original size using css
    canvas.css("width", width + "px");
    canvas.css("height", height + "px");

    return canvas;
};

ZigzagViz.prototype.drawGrid = function() {

    // Draw the horizontal lines
    for (var r = 1; r < this.numRows; r++) {
        this.drawLine(
            0,
            Math.floor(retina(r * this.cellHeight)),
            Math.floor(retina(this.numCols * this.cellWidth)),
            Math.floor(retina(r * this.cellHeight)),
            GRID_STROKE);
    }
    
    for (var c = 1; c < this.numCols; c++) {
        this.drawLine(
            Math.floor(retina(c * this.cellWidth)),
            0,
            Math.floor(retina(c * this.cellWidth)),
            Math.floor(retina(this.numRows * this.cellHeight)),
            GRID_STROKE);
    }
};

ZigzagViz.prototype.drawLine = function(x1, y1, x2, y2, color) {
    var line = new createjs.Shape();

    line.graphics.setStrokeStyle(retina(1));
    line.graphics.beginStroke(color);
    line.graphics.moveTo(x1, y1);
    line.graphics.lineTo(x2, y2);
    line.graphics.endStroke();

    this.stage.addChild(line);
}

var ZigzagSimViz = function(args) {
    this.simId = args.simId;
    this.simulator = new ZigzagSim(args);
    this.viz = new ZigzagViz(args);
};
