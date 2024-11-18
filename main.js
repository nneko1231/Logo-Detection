/*jshint esversion:6*/

$(function () {
    const video = $("video")[0];
    var model;
    var cameraMode = "environment";

    const startVideoStreamPromise = navigator.mediaDevices
        .getUserMedia({ audio: false, video: { facingMode: cameraMode } })
        .then(function (stream) {
            return new Promise(function (resolve) {
                video.srcObject = stream;
                video.onloadeddata = function () {
                    video.play();
                    resolve();
                };
            });
        });

    var publishable_key = "rf_FovOcxHRqZZ7J8hbhepssTXAokw2";

    // Default to Versi 1
    var toLoad = { model: "deteksi-logo-tcoed", version: 5 };

    // Dropdown handler to change model version
    $("#model-version").on("change", function () {
        const selectedVersion = parseInt($(this).val(), 10);
        $("body").addClass("loading");

        // Update model dan publishable_key sesuai pilihan
        if (selectedVersion === 5) {
            // Versi 1
            publishable_key = "rf_FovOcxHRqZZ7J8hbhepssTXAokw2";
            toLoad = { model: "deteksi-logo-tcoed", version: 5 };
        } else if (selectedVersion === 6) {
            // Versi 2
            publishable_key = "rf_FovOcxHRqZZ7J8hbhepssTXAokw2";
            toLoad = { model: "deteksi-logo-tcoed", version: 6 };
        } else if (selectedVersion === 1) {
            // Versi 3
            publishable_key = "rf_1ei29qYADSMQC3VSVoC7VwUx3XG3";
            toLoad = { model: "deteksi-logo-cl1eg", version: 1 };
        }

        loadModel(toLoad).then(function () {
            $("body").removeClass("loading");
        });
    });

    const loadModel = function (toLoad) {
        return roboflow.auth({ publishable_key: publishable_key }).load(toLoad).then(function (m) {
            model = m;
        });
    };

    const loadModelPromise = loadModel(toLoad);

    Promise.all([startVideoStreamPromise, loadModelPromise]).then(function () {
        $("body").removeClass("loading");
        resizeCanvas();
        detectFrame();
    });

    var canvas, ctx;
    const font = "16px sans-serif";
    var detectionTimeout;

    function videoDimensions(video) {
        var videoRatio = video.videoWidth / video.videoHeight;
        var width = video.offsetWidth, height = video.offsetHeight;
        var elementRatio = width / height;

        if (elementRatio > videoRatio) {
            width = height * videoRatio;
        } else {
            height = width / videoRatio;
        }

        return { width: width, height: height };
    }

    $(window).resize(function () {
        resizeCanvas();
    });

    const resizeCanvas = function () {
        $("canvas").remove();
        canvas = $("<canvas/>");
        ctx = canvas[0].getContext("2d");

        var dimensions = videoDimensions(video);
        canvas[0].width = video.videoWidth;
        canvas[0].height = video.videoHeight;

        canvas.css({
            width: dimensions.width,
            height: dimensions.height,
            left: ($(window).width() - dimensions.width) / 2,
            top: ($(window).height() - dimensions.height) / 2
        });

        $("body").append(canvas);
    };

    // This function renders the predictions and shows checkmark or cross
    const renderPredictions = function (predictions) {
        var dimensions = videoDimensions(video);
        var scale = 1;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
        if (predictions.length > 0) {
            clearTimeout(detectionTimeout);
            
            // Sembunyikan gambar silang dan tampilkan gambar centang
            $("#crossmark").hide();
            $("#checkmark").show();
    
            predictions.forEach(function (prediction) {
                const x = prediction.bbox.x;
                const y = prediction.bbox.y;
                const width = prediction.bbox.width;
                const height = prediction.bbox.height;
    
                ctx.strokeStyle = prediction.color;
                ctx.lineWidth = 4;
                ctx.strokeRect(
                    (x - width / 2) / scale,
                    (y - height / 2) / scale,
                    width / scale,
                    height / scale
                );
            });
        } else {
            // Jika tidak ada deteksi, mulai timer 5 detik untuk menampilkan gambar silang
            detectionTimeout = setTimeout(function () {
                $("#checkmark").hide();
                $("#crossmark").show();
            }, 5000);
        }
    };

    var prevTime;
    var pastFrameTimes = [];
    const detectFrame = function () {
        if (!model) return requestAnimationFrame(detectFrame);

        model.detect(video).then(function (predictions) {
            requestAnimationFrame(detectFrame);
            renderPredictions(predictions);

            if (prevTime) {
                pastFrameTimes.push(Date.now() - prevTime);
                if (pastFrameTimes.length > 30) pastFrameTimes.shift();

                var total = 0;
                _.each(pastFrameTimes, function (t) {
                    total += t / 1000;
                });

                var fps = pastFrameTimes.length / total;
                $("#fps").text(Math.round(fps));
            }
            prevTime = Date.now();
        }).catch(function (e) {
            console.log("CAUGHT", e);
            requestAnimationFrame(detectFrame);
        });
    };
});
