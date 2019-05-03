
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

//function eventTick(id) {
//    instances[id].eventTick();
//}

function initializeTicker() {
    createjs.Ticker.addEventListener("tick", tick)
    createjs.Ticker.setFPS(FPS)

    // temporary
    createjs.Ticker.paused = false;
}

initializeTicker();

function tick(event) {

    if (createjs.Ticker.paused || currentInstance == null) {
      return false;
    }

    //val rd = instances(activeInstanceId.get)
    //rd.viz.tick(event)
    //instances[currentInstance].tick(event);
    currentInstance.eventTick();
    return true;
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

var COLOR_RED = "hsl(0, 100%, 64%)"; //"#f45042";
var COLOR_WHITE = "white";

var GRID_STROKE = "#ccc";

var FPS = 10;

P_MOVE = 0;
P_TURN_LEFT = 1;
P_TURN_RIGHT = 2;


var ROTATE_LEFT = {
    0: LEFT,
    1: RIGHT,
    2: DOWN,
    3: UP
};

var ROTATE_RIGHT = {
    0: RIGHT,
    1: LEFT,
    2: UP,
    3: DOWN
};



var Particle = function(sim, id, r, c, direction) {
    this.sim = sim;
    this.id = id;
    this.row = r;
    this.col = c;
    this.direction = direction;
    this.instructionPointer = 0;
    this.numCollisions = 0;

    this.program = [
        P_MOVE,
        P_TURN_LEFT,
        P_MOVE,
        P_TURN_RIGHT
    ];
}

Particle.prototype.step = function() {
    var instruction = this.program[this.instructionPointer];

    if (instruction == P_MOVE) {
        var newRc = this.dirRowCol(this.direction, this.row, this.col);
        var r = newRc.row;
        var c = newRc.col;

        if (this.sim.matrix[r][c] == null) {
            this.sim.matrix[this.row][this.col] = null;
            this.sim.matrix[r][c] = this;
            this.row = r;
            this.col = c;
        } else {
            this.numCollisions += 1;

            // TODO: configurable
            if (this.numCollisions == 100) {
                this.numCollisions = 0;
                this.direction = ROTATE_LEFT[this.direction];
                // TODO: configurable alternate turning mechanisms
                this.instructionPointer = 0;
                return;

            }
        }

    } else if (instruction == P_TURN_LEFT) {
        this.direction = ROTATE_LEFT[this.direction];
    } else if (instruction == P_TURN_RIGHT) {
        this.direction = ROTATE_RIGHT[this.direction];
    } else {
        throw "Shouldn't happen";
    }

    this.instructionPointer = (this.instructionPointer + 1) % this.program.length;
}

Particle.prototype.dirRowCol = function(direction, row, col) {

    if (row < 0 || row >= this.sim.numRows || col < 0 || col >= this.sim.numCols) {
      throw "row, col is out of bounds";
    }

    var rc;

    if (direction == UP) {
        rc = {
            row: row - 1,
            col: col
        };
    } else if (direction == DOWN) {
        rc = {
            row: row + 1,
            col: col
        };
    } else if (direction == LEFT) {
        rc = {
            row: row,
            col: col - 1
        };
    } else if (direction == RIGHT) {
        rc = {
            row: row,
            col: col + 1
        };
    } else {
        throw "Shouldn't happen";
    }

    if (rc.row == -1) {
        rc.row = this.sim.numRows - 1;
    } else if (rc.row == this.sim.numRows) {
        rc.row = 0
    } else if (rc.col == -1)  {
        rc.col = this.sim.numCols - 1;
    } else if (rc.col == this.sim.numCols) {
        rc.col = 0;
    }

    return rc;
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
    this.particles = [];

    for (var i = 0; i < this.numParticles; i++) {
        var r;
        var c;
        do {
            r = randInt(this.numRows);
            c = randInt(this.numCols);
        } while (this.matrix[r][c] != null);
        var direction = randDirection();
        var p = new Particle(this, i, r, c, direction);
        this.matrix[r][c] = p;
        this.particles.push(p);
    }
};

ZigzagSim.prototype.step = function() {
    for (var i = 0; i < this.numParticles; i++) {
        this.particles[i].step(this);
    }
};

var ZigzagGrouping = function(sim) {
    this.sim = sim;

    this.current = 0;
    this.prev = 1;

    this.data = [
        {
            nextGroupId: 0,
            groups: [],
            colors: [],
        },
        {
            nextGroupId: 0,
            groups: [],
            colors: [],
        }];

    for (var i = 0; i <= 1; i++) {
        for (var j = 0; j < sim.numParticles; j++) {
            this.data[i].groups.push(new Set());
            this.data[i].colors.push(undefined);
        }        
    }

    this.groups = this.data[this.current].groups;
    this.colors = this.data[this.current].colors;

    this.assignGroups();
};

ZigzagGrouping.prototype.update = function() {
    this.assignGroups();
    this.reconcile();

    if (this.current == 0) {
        this.current = 1;
        this.prev = 0;
    } else {
        this.current = 0;
        this.prev = 1;
    }

    this.groups = this.data[this.current].groups;
    this.colors = this.data[this.current].colors;

    this.prevGroups = this.data[this.prev].groups;
    this.prevColors = this.data[this.prev].colors;
};

// TODO: JS backwards compat
function setIntersection(a, b) {
    return new Set([...a].filter(x => b.has(x)));
}

ZigzagGrouping.prototype.assignGroups = function() {

    this.data[this.current].nextGroupId = 0;

    for (var i = 0; i < this.sim.numParticles; i++) {
        this.sim.particles[i].groupId = undefined;
    }

    for (var i = 0; i < this.sim.numParticles; i++) {
        this.assignToGroup(this.sim.particles[i]);
    }
}

ZigzagGrouping.prototype.assignToGroup = function(particle, groupId) {
    if (particle.groupId !== undefined) {
        return;
    }

    if (groupId === undefined) {
        groupId = this.data[this.current].nextGroupId;
        this.data[this.current].nextGroupId++;

        this.groups[groupId].clear();

        var hue = randInt(360);
        this.colors[groupId] = `hsl(${hue}, 100%, 64%)`;
    }
    
    this.groups[groupId].add(particle.id);

    // The abstraction violation here seems worth it
    particle.groupId = groupId;

    var rcs = [
        particle.dirRowCol(UP, particle.row, particle.col),
        particle.dirRowCol(DOWN, particle.row, particle.col),
        particle.dirRowCol(LEFT, particle.row, particle.col),
        particle.dirRowCol(RIGHT, particle.row, particle.col)];

    for (var i = 0; i < rcs.length; i++) {
        var rc = rcs[i];
        var row = rc.row;
        var col = rc.col;

        var p = this.sim.matrix[row][col];

        if (p != null) {
            this.assignToGroup(p, particle.groupId);
        }
    }

}

ZigzagGrouping.prototype.reconcile = function() {

    // childrenOf[previousGroupId] = list of currentGroupIds for the groups
    // that are descendants of the group indexed by previousGroupId
    var childrenOf = [];

    var numPreviousGroups = this.data[this.prev].nextGroupId;
    var numCurrentGroups = this.data[this.current].nextGroupId;

    //var previousGroupIds = Object.keys(previousGrouping.groups);
    for (var j = 0; j < numPreviousGroups; j++) {
        childrenOf[j] = [];
    }

    // list of list of currentGroupIds for the groups that are not contained in
    // childrenOf
    var orphans = [];

    for (var i = 0; i < numCurrentGroups; i++) {
        
        var currentGroupId = i;
        var currentGroup = this.groups[currentGroupId];
        var foundParent = false;

        for (var j = 0; j < numPreviousGroups; j++) {
            var previousGroupId = j;
            var previousGroup = this.prevGroups[previousGroupId];
            var intersection = setIntersection(currentGroup, previousGroup);
            // TODO: configurable proportion?
            if (intersection.size / currentGroup.size > 0.5) {
                childrenOf[previousGroupId].push(currentGroupId);
                foundParent = true;
                break;
            }
        }

        if (!foundParent) {
            orphans.push(currentGroupId);
        }
    }

    //var groups = {};
    //var colors = {};

    for (var j = 0; j < numPreviousGroups; j++) {
        var previousGroupId = j;
        if (true) {//(previousGroupId in childrenOf) {
            var currentGroupIds = childrenOf[previousGroupId];
            var maxChildGroupId = undefined;

            for (var k = 0; k < currentGroupIds.length; k++) {
                var currentGroupId = currentGroupIds[k];
                if (maxChildGroupId === undefined || this.groups[currentGroupId].size > this.groups[maxChildGroupId].size) {
                    maxChildGroupId = currentGroupId;
                }
            }

            // magic happens here
            if (maxChildGroupId !== undefined) {
                //this.groups[previousGroupId] = this.groups[maxChildGroupId];
                var color;
                
                color = this.prevColors[previousGroupId];

                if (color === undefined) {
                    console.error("color undefined");
                }

                //console.log("current", this.groups[maxChildGroupId]);
                //console.log("prev", this.prevGroups[previousGroupId]);
                
                this.colors[maxChildGroupId] = color;

                /*var particleIds = [...this.groups[maxChildGroupId]];
                for (var k = 0; k < particleIds.length; k++) {
                    var pid = particleIds[k];
                    //this.sim.particles[pid].groupId = previousGroupId;
                }*/

            }

            // and here
            for (var k = 0; k < currentGroupIds; k++) {
                var currentGroupId = currentGroupIds[k];
                if (maxChildGroupId != currentGroupId) {
                    //this.groups[currentGroupId] = this.groups[currentGroupId];
                    var hue = randInt(360);
                    this.colors[currentGroupId] = `hsl(${hue}, 100%, 64%)`;
                }
            }
        }
    }

    // and here
    for (var i = 0; i < orphans.length; i++) {
        var orphanGroupId = orphans[i];
        //this.groups[orphanGroupId] = this.groups[orphanGroupId];
        var hue = randInt(360);
        this.colors[orphanGroupId] = `hsl(${hue}, 100%, 64%)`;
    }

    

}

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

    this.addConsole();

    //this.drawGrid();
}

function retina(value) {
    return value * window.devicePixelRatio;
}

ZigzagViz.prototype.addConsole = function() {
    var consoleHtml = `
        <div id="${this.simId}-console">
            <button type="button" class="btn btn-danger dark-border" onclick="clickPlayPause('${this.simId}')"><span id="${this.simId}-play-pause-button" class='glyphicon glyphicon-play'></span></button>
            <button type="button" class="btn dark-border" onclick="clickStep('${this.lifeId}')"><span class='glyphicon glyphicon-step-forward'></span></button>
            <button type="button" class="btn dark-border" onclick="clickFast('${this.simId}')"><span id="${this.simId}-fast-button" class='glyphicon glyphicon-forward'></span></button>
            <button type="button" class="btn dark-border" onclick="clickReset('${this.simId}')">Reset</button>
        </div>
    `;

    $("#" + this.simId).append(consoleHtml);
}

ZigzagViz.prototype.addStage = function() {
    var stage = new createjs.Stage(this.canvasId);
    stage.regX = -0.5;
    stage.regY = -0.5;
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

ZigzagViz.prototype.update = function(sim, grouping) {
    for (var r = 0; r < this.numRows; r++) {
        for (var c = 0; c < this.numCols; c++) {
            var cell = this.cells[r][c];
            var simState = sim.matrix[r][c] == null ? STATE_OFF : STATE_ON;
            //if (simState != cell.state) {
                cell.state = simState;
                var color = simState == STATE_OFF ? COLOR_WHITE : grouping.colors[sim.matrix[r][c].groupId];
                if (color === undefined) {
                    color = "black"; //console.log(1);
                }
                var x = c * this.cellWidth;
                var y = r * this.cellHeight;
                cell.shape.graphics.clear().beginFill(color).drawRect(x, y, this.cellWidth, this.cellHeight).endFill();
            //}
        }
    }
    this.stage.update();
}

var ZigzagSimViz = function(args) {
    this.simId = args.simId;
    instances[this.simId] = this;

    this.stepsPerTick = args.stepsPerTick;
    this.simulator = new ZigzagSim(args);
    this.grouping = new ZigzagGrouping(this.simulator);
    //this.grouping.update();
    this.viz = new ZigzagViz(args);
    this.viz.update(this.simulator, this.grouping);

    this.paused = true;

    if (args.play) {
        this.clickPlayPause();
    }
};

ZigzagSimViz.prototype.eventTick = function(event) {
    for (var i = 0; i < this.stepsPerTick; i++) {
        this.simulator.step();
        this.grouping.update();
    }

    this.viz.update(this.simulator, this.grouping);
}

ZigzagSimViz.prototype.clickPlayPause = function() {
    if (this.paused) {
        // then play

        // pause the current instance
        if (currentInstance != null) {
            currentInstance.clickPlayPause();
        }

        currentInstance = this;
        this.paused = false;
        $("#" + this.simId + "-play-pause-button").attr("class", "glyphicon glyphicon-pause");

        createjs.Ticker.paused = false;
    } else {
        // then pause
        
        this.paused = true;
        currentInstance = null;
        createjs.Ticker.paused = true;

        $("#" + this.simId + "-play-pause-button").attr("class", "glyphicon glyphicon-play");
    }
};
