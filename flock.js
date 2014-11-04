/* flock.js - Built by Andrew Capshaw */
var flockApp = function() {

    /* The default options to govern the behavior of the app. */
    var options = {
        canvasFrontId: null,
        canvasBackId: null,
        canvasOnClickAddBoid: true,
        boidSight: 100,
        boidMinVelocity: 5,
        boidMaxVelocity: 20,
        boidTurningLikelihood: 0.05,
        boidStrokeColor: "#fff",
        boidFillColor: "#222",
        boidSize: 10,
        trailStrokeColor: "#444",
        trailFillColor: "#999",
        drawTrail: true,
        drawDotted: false,
        updatePeriod: 100,
        flockSize: 30
    };

    /* The canvas and context elements to draw to. */
    var frontCanvas;
    var frontContext;
    var backCanvas;
    var backContext;

    /* The refresh interval id. Should the user request to cancel the animation
     * this is what is cleared. */
    var intervalId;

    /* Maintain our flock of boids. */
    var flock = [];

    /* Extend the default options with the user's options and check to ensure
     * that required options were successfully passed in. */
    var init = function (userOptions) {
        options = $.extend(options, userOptions);
        if(!hasRequiredParameters()) {
            return false;
        }
        setupHandlers();
    };

    /* Stop drawing the drawing and updating actions. */
    var stop = function () {
        if(!intervalId) {
            return false;
        }
        clearInterval(intervalId);
        intervalId = null;
        return true;
    }

    /* Start the drawing and updating actions. */
    var restart = function () {
        if(intervalId) {
            return false;
        }
        intervalId = setInterval(updateFlock, options.updatePeriod);
        return true;
    }

    /* Make sure that every option has a non-null value. */
    var hasRequiredParameters = function () {
        var valid = true;
        $.each(options, function (key, value) {
            if(value == null) {
                console.log("The option " + key + " is required.");
                valid = false;
            }
        });
        return valid;
    }

    /* Setup the handlers for the app. When the document is ready, find the
     * user-specified canvas's and resize them to fill their container. Also,
     * setup the resize handler to resize the canvas every time the page size
     * is changed. */
    var setupHandlers = function () {
        $(document).ready(function(){
            frontCanvas = document.getElementById(options.canvasFrontId);
            backCanvas = document.getElementById(options.canvasBackId);
            frontContext = frontCanvas.getContext("2d");
            backContext = backCanvas.getContext("2d");
            resizeCanvas(frontCanvas);
            resizeCanvas(backCanvas);
            flock = buildFlock(options.flockSize);
            restart();
        });

        $(window).resize(function(){
            resizeCanvas(frontCanvas);
            resizeCanvas(backCanvas);
        });

        $("#" + options.canvasFrontId).on("click", function(e){
            if(options.canvasOnClickAddBoid) {
                var boid = buildRandomBoid();
                boid.x = e.pageX;
                boid.y = e.pageY;
                flock.push(boid);
            }
        });
    }

    /* Javascript '%' operator returns remainder. This function implements the
     * modulo functionality such that negative values wrap around. */
    var mod = function (n, m) {
        var remain = n % m;
        return remain >= 0 ? remain : remain + m;
    }

    /* Returns a random integer inclusive to the minimum and maximum. */
    var randomInt = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /* Resize the canvas to fill the size of it's parent container. */
    var resizeCanvas = function (canvas) {
        canvas.width = $(canvas).parent().width();
        canvas.height = $(canvas).parent().height();
    }

    /* Clear the front canvas in preparation for drawing the boids new
     * positions. */
    var clearCanvas = function () {
        frontContext.width = frontContext.width;
        frontContext.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
    }

    /* Initialize a flock of boids of the defined size. */
    var buildFlock = function (size) {
        var flock = [];
        for(var i = 0; i < size; i++){
            flock.push(buildRandomBoid());
        }
        return flock;
    }

    /* Return a boid with a random starting location and movement vector. */
    var buildRandomBoid = function () {
        return {
            id: randomInt(0, 1000000),
            x: randomInt(0, frontCanvas.width),
            y: randomInt(0, frontCanvas.height),
            v: randomInt(options.boidMinVelocity, options.boidMaxVelocity),
            theta: Math.random() * Math.PI * 2
        };
    }

    /* Find the distance between two boids. Does not take into account canvas
     * wraparound. */
    var distance = function (boidA, boidB) {
        return Math.pow(boidA.x - boidB.x, 2) + Math.pow(boidA.y - boidB.y, 2);
    }

    /* Update each of the boid's vectors and position on the canvas. */
    var updateFlock = function () {
        clearCanvas();
        var i = flock.length,
            j,
            boid,
            other;
        /* zero out totals */
        while(--i) {
            boid = flock[i];
            boid.locals = 0;
            boid.averageXHeading = 0;
            boid.averageYHeading = 0;
        }
        /* find locals */
        i = flock.length;
        while(--i) {
            boid = flock[i];
            /* Find local boids. Fun O(n^2) times! */
            j = i;
            while(--j) {
                other = flock[j];
                if(distance(boid, other) < options.boidSight) {
                    boid.locals++;
                    boid.averageXHeading += Math.cos(other.theta);
                    boid.averageYHeading += Math.sin(other.theta);
                    other.locals++;
                    other.averageXHeading += Math.cos(boid.theta);
                    other.averageYHeading += Math.sin(boid.theta);
                }
            }
        }
        /* calculate movement */
        i = flock.length;
        while(--i) {
            boid = flock[i];
            if(boid.locals > 0) {
                boid.averageXHeading /= boid.locals;
                boid.averageYHeading /= boid.locals;

                // Move torwards average local heading.
                var newYHeading = (boid.averageYHeading + Math.sin(boid.theta))/2;
                var newXHeading = (boid.averageXHeading + Math.cos(boid.theta))/2;
                boid.theta = Math.atan2(newYHeading, newXHeading);
            }

            // Change directions randomly based on likelihood of doing so.
            if(Math.random() < options.boidTurningLikelihood){;
                var dtheta = Math.PI / 10;
                if(Math.random() > 0.5) {
                    dtheta *= -1;
                }
                boid.theta = mod(boid.theta + dtheta, 2 * Math.PI);
            }

            // Speed up or down randomly.
            boid.v += randomInt(-1, 1);
            boid.v = Math.min(boid.v, options.boidMaxVelocity);
            boid.v = Math.max(boid.v, options.boidMinVelocity);

            // Move the boid.
            boid.x += Math.cos(boid.theta) * boid.v;
            boid.y += Math.sin(boid.theta) * boid.v;

            // Wrap around the canvas
            boid.x = mod(boid.x, frontCanvas.width);
            boid.y = mod(boid.y, frontCanvas.height);

            drawboid(frontContext, boid);
        }
    }

    /* Draw a boid to the front canvas and it's trail to the back canvas. */
    var drawboid = function (context, boid) {

        // Find the coordinates of the paper-airplane-shaped boid.
        var l = options.boidSize;
        var backX = Math.cos(boid.theta) * l * -1;
        var backY = Math.sin(boid.theta) * l * -1;
        var backRightX = Math.cos(boid.theta + Math.PI/10) * (l + 2) * -1;
        var backRightY = Math.sin(boid.theta + Math.PI/10) * (l + 2) * -1;
        var backLeftX = Math.cos(boid.theta - Math.PI/10) * (l + 2) * -1;
        var backLeftY = Math.sin(boid.theta - Math.PI/10) * (l + 2) * -1;

        // Draw the boid.
        context.beginPath();
        context.strokeStyle = options.boidStrokeColor;
        context.fillStyle = options.boidFillColor;
        context.moveTo(boid.x + backX, boid.y + backY);
        context.lineTo(boid.x + backRightX, boid.y + backRightY);
        context.lineTo(boid.x, boid.y);
        context.lineTo(boid.x + backLeftX, boid.y + backLeftY);
        context.closePath();
        context.stroke();
        context.fill();

        // Draw the trail, if desired.
        if(options.drawTrail) {
            backContext.beginPath();
            backContext.strokeStyle = options.trailStrokeColor;
            backContext.fillStyle = options.trailFillColor;
            if(!options.drawDotted){
                backContext.moveTo(boid.x, boid.y);
                var oldX = boid.x - boid.v * Math.cos(boid.theta);
                var oldY = boid.y - boid.v * Math.sin(boid.theta);
                backContext.lineTo(oldX, oldY);
            } else {
                backContext.fillRect(boid.x, boid.y, 1, 1);
            }
            backContext.closePath();
            backContext.stroke();
        }
    }

    return {
        init: init,
        stop: stop,
        restart: restart
    };
};
