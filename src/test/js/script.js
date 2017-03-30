function loadClass(path, loader) {
    let logErrors = function(ev) {
        console.error(ev);
    }
    let req = new XMLHttpRequest();
    req.responseType = "arraybuffer";
    req.addEventListener("load", function(ev) {
        if (ev.target.status === 200) {
            console.log("Fetched class:", path);
            try {
                loader(ev.target.response);
            }
            catch (e) {
                console.error("FAILED!", e);
            }
        }
        else {
            console.error("Failed to load class:", path);
        }
    });
    req.addEventListener("error", logErrors);
    req.addEventListener("abort", logErrors);
    req.open("GET", path)
    req.send();
}

document.addEventListener("DOMContentLoaded", function() {
    console.log("Main script loaded.");
    console.log("Java: ", Java);

    loadClass("../java/HelloWorld.class", bin => Java.load(bin));
    // loadClass("../java/Imaginary.class", Java.load);
});
