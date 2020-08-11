/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/ellipsoids.json"; // ellipsoids file loc

var Eye = new vec3.fromValues(0.5, 0.5, -0.5);    // default Eye position in world space
var lookAt = new vec3.fromValues(0, 0, 1);        // look at vector
var up = new vec3.fromValues(0, 1, 0);        // view up vector

var light = new vec3.fromValues(0.25,0.25,0.5);     // default light location in world space
var orth = 0;
/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var flag=0;
// buffers for vertex shader
var triangleBufferSize;//the number of indices in the triangle buffer
var VertexBuffer; //for vertex coordinates in triangles
var IndexBuffer; //for indices into VertexBuffer in triangles (Had not implemented this way in HW 2, lost 10 points, Hence implementing this way now)
var NormalBuffer;  //normals for traingles
var AmbientBuffer; //ambient values in triangles
var DiffuseBuffer; //diffuse values in triangles
var SpecularBuffer; //specular values in triangles
var SpecularExpBuffer;   //specular exponent in triangles
var ModelIndexBuffer;      //index of the model that a vertex belongs to

// uniforms for vertex shader
var viewMatrix = mat4.create();   // view matrix
var projMatrix = mat4.create();   // projection matrix
// var orthMatrix = mat4.create();
var oldMatrix = [];
var transformMat = mat4.create();  // transform matrix
var selected = 0.0;              // traingle model currently selected
            
var eyePositionUniform;
var lightPositionUniform;
var viewMatrixUniform;
var projMatrixUniform;
var transformMatrixUniform;
var selectedModelUniform;
var ambientUniform;
var diffuseUniform;
var specularUniform;
var expUniform;
var vertexPositionAttrib;
var vertexNormalAttrib;
var ambientAttrib;
var diffuseAttrib;
var specularAttrib;
var specularExpAttrib;
var modelIndexAttrib;


var coordArray = []; 
var indexArray = []; 
var vertexBufferSize = 0; 
var normalArray = [];   
var ambientArray = [];  
var diffuseArray = [];  
var specularArray = []; 
var specularExpArray = [];   
var modelIndexArray = [];
var ambientTerm; 
var diffuseTerm;
var specularTerm;
var specularExp;

var modelCount = 1.0;
var selectedTriangle = 0.0;
var inputTriangles;
var modelCenters = {};

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
} // end get json file

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

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

function defineIndexArrayForEachTriangle(length, newTriangle, indexOffset, whichSet, indexArray)
{
  var whichSetTri=0;
  while(whichSetTri<length){
      vec3.add(newTriangle,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
      indexArray.push(newTriangle[0],newTriangle[1],newTriangle[2]);
      whichSetTri++
  } 
}


function arraysDefine( length, whichSet, ambientTerm, diffuseTerm, specularTerm, specularExp, center)
{
  var whichSetVert = 0;
  while(whichSetVert < length)
  {
    vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
    coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);

    normalToAdd = inputTriangles[whichSet].normals[whichSetVert];
    normalArray.push(normalToAdd[0], normalToAdd[1], normalToAdd[2]);

    ambientArray.push(ambientTerm[0], ambientTerm[1], ambientTerm[2]);
    diffuseArray.push(diffuseTerm[0], diffuseTerm[1], diffuseTerm[2]);
    specularArray.push(specularTerm[0], specularTerm[1], specularTerm[2]);
    specularExpArray.push(specularExp);
    modelIndexArray.push(modelCount);
    vec3.add(center, center, vtxToAdd);
    whichSetVert++;
  } // end for vertices in set
}

function setDefine(length, indexOffset, ambientTerm, diffuseTerm, specularTerm, specularExp, center, newTriangle)
{
  var whichSet = 0;
    while(whichSet<length){
      vec3.set(indexOffset,vertexBufferSize,vertexBufferSize,vertexBufferSize);                  //vertex start is updated here

      var ambientTerm = inputTriangles[whichSet].material.ambient;
      var diffuseTerm = inputTriangles[whichSet].material.diffuse;
      var specularTerm = inputTriangles[whichSet].material.specular;
      var specularExp = inputTriangles[whichSet].material.n;

      var center = vec3.create();

      arraysDefine( inputTriangles[whichSet].vertices.length, whichSet, ambientTerm, diffuseTerm, specularTerm, specularExp, center)

      defineIndexArrayForEachTriangle(inputTriangles[whichSet].triangles.length, newTriangle, indexOffset, whichSet, indexArray);
    

      vertexBufferSize += inputTriangles[whichSet].vertices.length;                             //total vertices
      triangleBufferSize += inputTriangles[whichSet].triangles.length;                          //total triangles

      vec3.scale(center, center, (1.0/inputTriangles[whichSet].vertices.length));
      modelCenters[modelCount] = center;
      modelCount++;
      whichSet++
  }
}

function activateBuffers(currentBuffer, currentArray)
{
  gl.bindBuffer(gl.ARRAY_BUFFER,currentBuffer); // activate that buffer
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(currentArray),gl.STATIC_DRAW); // coords to that buffer
}


// read triangles in, load them into webgl buffers
function loadTriangles(){
    inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");

    if (inputTriangles != String.null) {
        
        var indexOffset = vec3.create(); // the index start for the current set
        var newTriangle = vec3.create(); // tri indices to add to the index array

        
        var whichSet=0;

        ambientTerm = inputTriangles[whichSet].material.ambient;
        diffuseTerm = inputTriangles[whichSet].material.diffuse;
        specularTerm = inputTriangles[whichSet].material.specular;
        specularExp = inputTriangles[whichSet].material.n;

        var center = vec3.create();


        setDefine(inputTriangles.length, indexOffset, ambientTerm, diffuseTerm, specularTerm, specularExp, center, newTriangle)
        console.log("Index Array")
        console.log(indexArray)
        console.log("Coordinate Array")
        console.log(coordArray)
        console.log("Normal Array")
        console.log(normalArray)
        console.log("Ambient Array")
        console.log(ambientArray)
        console.log("Diffuse Array")
        console.log(diffuseArray)
        console.log("Specular Array")
        console.log(specularArray)
        console.log("Model Index Array")
        console.log(modelIndexArray)
        
        VertexBuffer = gl.createBuffer(); 
        activateBuffers(VertexBuffer, coordArray);

        NormalBuffer = gl.createBuffer();
        activateBuffers(NormalBuffer, normalArray);
        
        AmbientBuffer = gl.createBuffer();
        activateBuffers(AmbientBuffer, ambientArray);
        
        DiffuseBuffer = gl.createBuffer();
        activateBuffers(DiffuseBuffer, diffuseArray);
        
        SpecularBuffer = gl.createBuffer();
        activateBuffers(SpecularBuffer, specularArray);
        
        SpecularExpBuffer = gl.createBuffer();
        activateBuffers(SpecularExpBuffer, specularExpArray);
        
        ModelIndexBuffer = gl.createBuffer();
        activateBuffers(ModelIndexBuffer, modelIndexArray);
        IndexBuffer = gl.createBuffer(); 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, IndexBuffer); 
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); 
        triangleBufferSize = indexArray.length;
    } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {

    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float;

        varying vec3 fragColor;

        void main(void) {
            gl_FragColor = vec4(fragColor, 1.0);
        }
    `;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        precision mediump float;

        attribute vec3 vertexPosition;
        attribute vec3 vertexNormal;
        attribute vec3 ambient;
        attribute vec3 diffuse;
        attribute vec3 specular;
        attribute float factor;
        attribute float modelIndex;

        uniform vec3 lightPosition;
        uniform vec3 eyePosition;

        uniform mat4 vMatrix;
        uniform mat4 pMatrix;
        uniform mat4 tMatrix;
        uniform float selected;

        varying vec3 fragColor;

        void main(void) {
            mat4 transform = (modelIndex == selected) ? tMatrix : mat4(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1);  // apply transformation if selected model, identity otherwise
            gl_Position = pMatrix * vMatrix * transform * vec4(vertexPosition, 1.0);

            vec3 N = vertexNormal;
            vec3 L = normalize(lightPosition - vertexPosition);
            float NdotL = dot(N, L);

            vec3 V = normalize(eyePosition - vertexPosition);
            vec3 H = normalize(L+V);

            vec3 totalAmb = ambient;
            vec3 totalDiff = diffuse;
            vec3 totalSpec = specular;
            float totalN = factor;
            
            float specCoeff = pow(dot(N, H), totalN); 

            float red = max(0.0, totalAmb[0]) + max(0.0, totalDiff[0]*NdotL) + max(0.0, totalSpec[0] * specCoeff);
            float green = max(0.0, totalAmb[1]) + max(0.0, totalDiff[1]*NdotL) + max(0.0, totalSpec[1] * specCoeff);
            float blue = max(0.0, totalAmb[2]) + max(0.0, totalDiff[2]*NdotL) + max(0.0, totalSpec[2] * specCoeff);

            fragColor = vec3(red, green, blue);
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
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array

                vertexNormalAttrib =gl.getAttribLocation(shaderProgram, "vertexNormal");
                gl.enableVertexAttribArray(vertexNormalAttrib);

                ambientAttrib = gl.getAttribLocation(shaderProgram, "ambient");
                gl.enableVertexAttribArray(ambientAttrib);

                diffuseAttrib = gl.getAttribLocation(shaderProgram, "diffuse");
                gl.enableVertexAttribArray(diffuseAttrib);

                specularAttrib = gl.getAttribLocation(shaderProgram, "specular");
                gl.enableVertexAttribArray(specularAttrib);

                specularExpAttrib = gl.getAttribLocation(shaderProgram, "factor");
                gl.enableVertexAttribArray(specularExpAttrib);

                modelIndexAttrib = gl.getAttribLocation(shaderProgram, "modelIndex");
                gl.enableVertexAttribArray(modelIndexAttrib);

                lightPositionUniform = gl.getUniformLocation(shaderProgram, 'lightPosition');
                gl.uniform3fv(lightPositionUniform, light);

                eyePositionUniform = gl.getUniformLocation(shaderProgram, 'eyePosition');
                gl.uniform3fv(eyePositionUniform, Eye);

                projMatrixUniform = gl.getUniformLocation(shaderProgram, 'pMatrix');
                viewMatrixUniform = gl.getUniformLocation(shaderProgram, 'vMatrix');
                transformMatrixUniform = gl.getUniformLocation(shaderProgram, 'tMatrix');
                selectedModelUniform = gl.getUniformLocation(shaderProgram, 'selected');

            } // end if no shader program link errors
        } // end if no compile errors
    } // end try

    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

function activateAndFeedBuffers(currentBuffer, currentAttribute, value)
{
    gl.bindBuffer(gl.ARRAY_BUFFER,currentBuffer); // activate
    gl.vertexAttribPointer(currentAttribute,value,gl.FLOAT,false,0,0); // feed
}


// render the loaded model
function renderTriangle(){

    var center = vec3.create();
    vec3.add(center, Eye, lookAt);
    mat4.lookAt(viewMatrix, Eye, center, up);
    if(orth == 1)
      mat4.ortho(projMatrix, -1.0, 1.0, -1.0, 1.0, 0.1, 100.0);
    else
      mat4.perspective(projMatrix, glMatrix.toRadian(90), gl.viewportWidth/gl.viewportHeight, 0.1, 100.0);

    gl.uniformMatrix4fv(projMatrixUniform, gl.FALSE, projMatrix);
    gl.uniformMatrix4fv(viewMatrixUniform, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(transformMatrixUniform, gl.FALSE, transformMat);
    gl.uniform1f(selectedModelUniform, selected);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    // activate and feed buffers into vertex shader
    activateAndFeedBuffers(VertexBuffer,vertexPositionAttrib, 3);

    activateAndFeedBuffers(NormalBuffer,vertexNormalAttrib, 3);

    activateAndFeedBuffers(AmbientBuffer,ambientAttrib, 3);

    activateAndFeedBuffers(DiffuseBuffer,diffuseAttrib, 3);

    activateAndFeedBuffers(SpecularBuffer,specularAttrib, 3);

    activateAndFeedBuffers(SpecularExpBuffer,specularExpAttrib, 1);

    activateAndFeedBuffers(ModelIndexBuffer,modelIndexAttrib, 1);


    //activating and rendering triangle buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,IndexBuffer); 
    gl.drawElements(gl.TRIANGLES, triangleBufferSize, gl.UNSIGNED_SHORT,0);

}

var key_pressed = {};

function handleKeyDown(event){
  key_pressed[event.keyCode] = true;

  switch(event.keyCode)
  {
      case 37: 
        selectedTriangle = selectedTriangle-1.0;
        if(selectedTriangle < 0.0)
        {
            selectedTriangle += inputTriangles.length;
        } 
        selected = selectedTriangle + 1.0;
        break; 
      case 39:
        selectedTriangle = selectedTriangle+1.0;
        selectedTriangle %=inputTriangles.length;
        selected = selectedTriangle + 1.0;
        break;
      case 32:
        selected = 0.0;
        break;  
  }
}

function handleKeyUp(event){
  key_pressed[event.keyCode] = false;
}

function translate(X, translatearr){
  vec3.add(X,X,translatearr)
}

function rotate(X, rotateval, axis){
  switch (axis){
    case 'Y': vec3.rotateY(X, X, [0, 0, 0], rotateval);
              break;
    case 'X': vec3.rotateX(X, X, [0, 0, 0], rotateval);
              break;
    case 'Z': vec3.rotateZ(X, X, [0, 0, 0], rotateval);
              break;
  }
}

function perform(X, translatearr, what){
  switch(what){
    case 'translate': mat4.translate(X, X, translatearr);
                      break;
    case 'scale': mat4.scale(X, X, translatearr);
                  break;
  }
  
}
function handleKeysAndRender(){
  requestAnimationFrame(handleKeysAndRender);

  var translateIncrement = 0.03;
  var rotateIncrement = glMatrix.toRadian(3);
  var modelCenter = modelCenters[selected];
  
  if(key_pressed[65]){translate(Eye, [translateIncrement, 0, 0]);}                      // translate view left(a)
  if(key_pressed[68]){translate(Eye, [-translateIncrement, 0, 0]);}                     // translate view right(d)
  if(!key_pressed[16] && key_pressed[69]){translate(Eye, [0, -translateIncrement, 0]);}                     //Weirdly if I dont put !key_pressed[16] in the condition it would still translate my view down(e) when I press(E)        
  if(!key_pressed[16] && key_pressed[81]){translate(Eye, [0, translateIncrement, 0]);}                      //Weirdly if I dont put !key_pressed[16] in the condition it would still translate my view up(q) when I press(Q)
  if(key_pressed[83]){translate(Eye, [0, 0, -translateIncrement]);}                     // translate view backward(w)
  if(key_pressed[87]){translate(Eye, [0, 0, translateIncrement]);}                      // translate view forward(z)
  
  if(key_pressed[16] && key_pressed[65]){rotate(lookAt, rotateIncrement, 'Y');}                                        //rotate left around Y axis(A)
  if(key_pressed[16] && key_pressed[68]){rotate(lookAt, -rotateIncrement, 'Y');}                                       //rotate right around Y axis(D)

  if(key_pressed[16] && key_pressed[87]){rotate(lookAt, rotateIncrement, 'X');    rotate(up, rotateIncrement, 'X');}   //rotate left around X axis(W)
  if(key_pressed[16] && key_pressed[83]){rotate(lookAt, -rotateIncrement, 'X');   rotate(up, -rotateIncrement, 'X');}  //rotate right around X axis(S)

  
  if(key_pressed[37] || key_pressed[39]){              //Select a Model(<- and ->)
    // console.log(transformMat);
    // flag = 1;
    // oldMatrix.concat(transformMat);
    mat4.identity(transformMat);
    // console.log(transformMat);
    perform(transformMat, modelCenter, 'translate');
    // console.log(transformMat);
    perform(transformMat, [1.2, 1.2, 1.2], 'scale');
    // console.log(transformMat);
    perform(transformMat, [-modelCenter[0], -modelCenter[1], -modelCenter[2]], 'translate');
    // console.log(transformMat);
  }
  if(key_pressed[32]){ flag=0; mat4.identity(transformMat);}           //Unselect the previously selected model
  

  if(!key_pressed[16] && key_pressed[75]){perform(transformMat, [translateIncrement, 0, 0], 'translate');}                        //Translate selected model to left(k)
  if(!key_pressed[16] && key_pressed[186]){perform(transformMat, [-translateIncrement, 0, 0], 'translate');}                      //Translate selected model to right(;)
  if(!key_pressed[16] && key_pressed[79]){perform(transformMat, [0, 0, -translateIncrement], 'translate');}                       //Translate selected model to front(o)
  if(!key_pressed[16] && key_pressed[76]){perform(transformMat, [0, 0, translateIncrement], 'translate');}                        //Translate selected model to back(l)
  if(!key_pressed[16] && key_pressed[73]){perform(transformMat, [0, translateIncrement, 0], 'translate');}                        //Translate selected model to up(i) 
  if(!key_pressed[16] && key_pressed[80]){perform(transformMat, [0, -translateIncrement, 0], 'translate');}                       //Translate selected model to down(p)

  if(key_pressed[16] && key_pressed[75]){perform(transformMat, modelCenter, "translate"); mat4.rotateY(transformMat, transformMat, rotateIncrement); perform(transformMat, [-modelCenter[0], -modelCenter[1], -modelCenter[2]], "translate");}                 //Rotate selected model to left(K)
  if(key_pressed[16] && key_pressed[186]){perform(transformMat, modelCenter, "translate"); mat4.rotateY(transformMat, transformMat, -rotateIncrement); perform(transformMat, [-modelCenter[0], -modelCenter[1], -modelCenter[2]], "translate");}              //Rotate selected model to right(:)
  if(key_pressed[16] && key_pressed[79]){perform(transformMat, modelCenter, "translate"); mat4.rotateX(transformMat, transformMat, rotateIncrement); perform(transformMat, [-modelCenter[0], -modelCenter[1], -modelCenter[2]], "translate");}                //Rotate selected model to forward(O)
  if(key_pressed[16] && key_pressed[76]){perform(transformMat, modelCenter, "translate"); mat4.rotateX(transformMat, transformMat, -rotateIncrement); perform(transformMat, [-modelCenter[0], -modelCenter[1], -modelCenter[2]], "translate");}               //Rotate selected model to backward(L)
  if(key_pressed[16] && key_pressed[73]){perform(transformMat, modelCenter, "translate"); mat4.rotateZ(transformMat, transformMat, rotateIncrement); perform(transformMat, [-modelCenter[0], -modelCenter[1], -modelCenter[2]], "translate");}                //Rotate selected model clockwise(I)
  if(key_pressed[16] && key_pressed[80]){perform(transformMat, modelCenter, "translate"); mat4.rotateZ(transformMat, transformMat, -rotateIncrement); perform(transformMat, [-modelCenter[0], -modelCenter[1], -modelCenter[2]], "translate");}               //Rotate selected model counter-clockwise(P)
    
  
  if(key_pressed[187]){
    mat4.identity(transformMat);
    // mat4.ortho(projMatrix, -1.0, 1.0, -1.0, 1.0, 0.1, 100.0)
    orth=1;
  }

  if(key_pressed[188]){
    orth = 0;
    // mat4.perspective(projMatrix, glMatrix.toRadian(90), gl.viewportWidth/gl.viewportHeight, 0.1, 100.0);
  }

  // if(flag == 1){
  //   for(var i=0; i<oldMatrix.length; i++){
  //     transformMat = oldMatrix[i];
  //     renderTriangle();
  //   }
  // }

  // else
  renderTriangle();
  
  
}


function main() {
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  
  setupShaders(); // setup the webGL shaders

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;

  handleKeysAndRender();
} // end main

