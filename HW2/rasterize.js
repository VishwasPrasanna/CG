/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/spheres.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var colorBuffer;
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize =0; // the number of indices in the triangle buffer
var color_data = [];
var vertexPositionAttrib;
var colorAttrib; // where to put position for vertex shader


// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

// read triangles in, load them into webgl buffers
function loadTriangles() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
    if (inputTriangles != String.null) { 
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var coordArray = []; // 1D array of vertex coords for WebGL
        // inputTriangles
        
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            // console.log(inputTriangles[whichSet].triangles.length)
            // set up the vertex coord array
            for (whichSetTri=0; whichSetTri < inputTriangles[whichSet].triangles.length; whichSetTri++){
                triBufferSize += 1;
                console.log(whichSetTri)
                    
                // console.log(inputTriangles[whichSet].triangles[0].length)    
                for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].triangles[whichSetTri].length; whichSetVert++){
                    // console.log(inputTriangles[whichSet].vertices.length)
                    // console.log("before:"+coordArray)
                    // console.log('a')
                    
                    // console.log(inputTriangles[whichSet].material.diffuse[whichSetVert])
                    color_data = color_data.concat(inputTriangles[whichSet].material.diffuse)
                    color_data = color_data.concat(1)
                    console.log(inputTriangles[whichSet].vertices[inputTriangles[whichSet].triangles[whichSetTri][whichSetVert]])
                    coordArray = coordArray.concat(inputTriangles[whichSet].vertices[inputTriangles[whichSet].triangles[whichSetTri][whichSetVert]]);
                    // console.log("after:"+coordArray)
                    // console.log(inputTriangles[whichSet].vertices[whichSetVert]);
                }
                
                // console.log(coordArray)
            } 
        }// end for each triangle set 
        // console.log(coordArray.length);
        // send the vertex coords to webGL
        triBufferSize *= 3;
        console.log(color_data)
        console.log(coordArray)
        vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer

        colorBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(color_data),gl.STATIC_DRAW); // coords to that buffer
    } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float;
        varying vec4 varyingColors;
        void main(void) {
            gl_FragColor = varyingColors; // all fragments are white
        }
    `;
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        precision mediump float;
        attribute vec3 vertexPosition;
        attribute vec4 colors;
        varying vec4 varyingColors;
        void main(void) {
            gl_Position = vec4(vertexPosition, 1.0); // use the untransformed position
            varyingColors = colors;
        }
    `;
    
    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                console.log(vertexPositionAttrib)
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array

                colorAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "colors"); 
                console.log(colorAttrib)
                gl.enableVertexAttribArray(colorAttrib); // input to shader from array
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    
    // console.log(vertexBuffer)
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed
    // console.log(gl.ARRAY_BUFFER.length)
    // console.log(coordArray)
    // console.log(coordArray.leng th)
    gl.drawArrays(gl.TRIANGLES,0,triBufferSize); // render

    gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer); // activate
    gl.vertexAttribPointer(colorAttrib,4,gl.FLOAT,false,0,0); // feed
    // console.log(gl.ARRAY_BUFFER.length)
    // console.log(coordArray)
    // console.log(coordArray.leng th)
    gl.enableVertexAttribArray(colorAttrib);
    gl.drawArrays(gl.TRIANGLES,0,color_data.length); // render



} // end render triangles


/* MAIN -- HERE is where execution begins after window load */

function main() {
  
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL
  
} // end main