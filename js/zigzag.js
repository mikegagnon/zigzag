
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

var STATE_OFF = 0;
var STATE_ON = 1;

var COLOR_RED = "#f45042"
var COLOR_WHITE = "white"

var GRID_STROKE = "#ccc";

var Particle = function(r, c, direction) {
    this.r = r;
    this.c = c;
    this.direction = direction;
}

function newMatrix(rows, cols) {
    var matrix = [];
    for (var r = 0; r < rows; r++) {
        matrix.push([]);
        for (var c = 0; c < cols; c++) {
            matrix[r].push(null);
        }
    }
    return matrix;
}

var ZigzagSim = function(args) {
    this.numRows = args.numRows;
    this.numCols = args.numCols;
    this.numParticles = args.numParticles;

    this.matrix = newMatrix(this.numRows, this.numCols);
    /*for (var r = 0; r < this.numRows; r++) {
        this.matrix.push([]);
        for (var c = 0; c < this.numCols; c++) {
            this.matrix[r].push(null);
        }
    }*/

    for (var i = 0; i < this.numParticles; i++) {
        var r;
        var c;
        do {
            r = randInt(this.numRows);
            c = randInt(this.numCols);
        } while (this.matrix[r][c] != null);

        var direction = randDirection();

        var p = new Particle(r, c, direction);
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
    this.cellWidth = retina(this.width / this.numCols);
    this.cellHeight = retina(this.height / this.numRows);

    this.canvas = this.addCanvas();
    this.stage = this.addStage();

    this.cells = this.drawCells();

    this.drawGrid();
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


    var width = this.width;
    var height = this.height;

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

ZigzagViz.prototype.drawCells = function() {
    var matrix = newMatrix(this.numRows, this.numCols);

    for (var r = 0; r < this.numRows; r++) {
        for (var c = 0; c < this.numCols; c++) {
            var x = c * this.cellWidth;
            var y = r * this.cellHeight;
            var shape = new createjs.Shape();
            shape.graphics.beginFill(COLOR_WHITE).drawRect(x, y, this.cellWidth, this.cellHeight).endFill();
            this.stage.addChild(shape);
            matrix[r][c] = {
                state: STATE_OFF,
                shape: shape
            }
        }
    }

    return matrix;
}

ZigzagViz.prototype.drawGrid = function() {

    // Draw the horizontal lines
    for (var r = 1; r < this.numRows; r++) {
        this.drawLine(
            0,
            Math.floor(r * this.cellHeight),
            Math.floor(this.numCols * this.cellWidth),
            Math.floor(r * this.cellHeight),
            GRID_STROKE);
    }
    
    for (var c = 1; c < this.numCols; c++) {
        this.drawLine(
            Math.floor(c * this.cellWidth),
            0,
            Math.floor(c * this.cellWidth),
            Math.floor(this.numRows * this.cellHeight),
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

ZigzagViz.prototype.update = function(sim) {
    for (var r = 0; r < this.numRows; r++) {
        for (var c = 0; c < this.numCols; c++) {
            var cell = this.cells[r][c];
            var simState = sim.matrix[r][c] == null ? STATE_OFF : STATE_ON;
            if (simState != cell.state) {
                var color = simState == STATE_OFF ? COLOR_WHITE : COLOR_RED;
                var x = c * this.cellWidth;
                var y = r * this.cellHeight;
                cell.shape.graphics.clear().beginFill(color).drawRect(x, y, this.cellWidth, this.cellHeight).endFill();
            }
        }
    }
    this.stage.update();
}

var ZigzagSimViz = function(args) {
    this.simId = args.simId;
    this.simulator = new ZigzagSim(args);
    this.viz = new ZigzagViz(args);

    this.viz.update(this.simulator);
};
