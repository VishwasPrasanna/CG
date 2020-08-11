/* classes */ 

// Color constructor
class Color {
    constructor(r,g,b,a) {
        try {
            if ((typeof(r) !== "number") || (typeof(g) !== "number") || (typeof(b) !== "number") || (typeof(a) !== "number"))
                throw "color component not a number";
            else if ((r<0) || (g<0) || (b<0) || (a<0)) 
                throw "color component less than 0";
            else if ((r>255) || (g>255) || (b>255) || (a>255)) 
                throw "color component bigger than 255";
            else {
                this.r = r; this.g = g; this.b = b; this.a = a; 
            }
        } // end try
        
        catch (e) {
            console.log(e);
        }
    } // end Color constructor

        // Color change method
    change(r,g,b,a) {
        try {
            if ((typeof(r) !== "number") || (typeof(g) !== "number") || (typeof(b) !== "number") || (typeof(a) !== "number"))
                throw "color component not a number";
            else if ((r<0) || (g<0) || (b<0) || (a<0)) 
                throw "color component less than 0";
            else if ((r>255) || (g>255) || (b>255) || (a>255)) 
                throw "color component bigger than 255";
            else {
                this.r = r; this.g = g; this.b = b; this.a = a; 
            }
        } // end throw
        
        catch (e) {
            console.log(e);
        }
    } // end Color change method
} // end color class

var Vector = function(x,y,z){
    this.x = x;
    this.y = y;
    this.z = z;
}

/* utility functions */

// draw a pixel at x,y using color
function drawPixel(imagedata,x,y,color) {
    try {
        if ((typeof(x) !== "number") || (typeof(y) !== "number"))
            throw "drawpixel location not a number";
        else if ((x<0) || (y<0) || (x>=imagedata.width) || (y>=imagedata.height))
            throw "drawpixel location outside of image";
        else if (color instanceof Color) {
            var pixelindex = (y*imagedata.width + x) * 4;
            imagedata.data[pixelindex] = color.r;
            imagedata.data[pixelindex+1] = color.g;
            imagedata.data[pixelindex+2] = color.b;
            imagedata.data[pixelindex+3] = color.a;
        } else 
            throw "drawpixel color is not a Color";
    } // end try
    
    catch(e) {
        console.log(e);
    }
} // end drawPixel

//get the input boxex from the standard class URL
function getInputBoxes() {
    const INPUT_BOXES_URL = 
        "https://ncsucgclass.github.io/prog1/boxes.json";
        
    // load the boxes file
    var httpReq = new XMLHttpRequest(); // a new http request
    httpReq.open("GET",INPUT_BOXES_URL,false); // init the request
    httpReq.send(null); // send the request
    var startTime = Date.now();
    while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
        if ((Date.now()-startTime) > 3000)
            break;
    } // until its loaded or we time out after three seconds
    if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE)) {
        console.log*("Unable to open input boxes file!");
        return String.null;
    } else
        return JSON.parse(httpReq.response); 
} // end get input boxes

function get_bp_color(eye,k,intersectionpoint,lightVector){
    var box = getInputBoxes()[k];

    var dist_from_left_plane = Math.abs(intersectionpoint.x - box.lx);
    var dist_from_right_plane = Math.abs(intersectionpoint.x - box.rx);
    var dist_from_top_plane = Math.abs(intersectionpoint.y - box.ty);
    var dist_from_bottom_plane = Math.abs(intersectionpoint.y - box.by);
    var dist_from_front_plane = Math.abs(intersectionpoint.z - box.fz);
    var dist_from_back_plane = Math.abs(intersectionpoint.z - box.rz);
    // console.log(dist_from_back_plane)

    var intersectingplane = Math.min(dist_from_left_plane,dist_from_right_plane,dist_from_top_plane,dist_from_bottom_plane,dist_from_front_plane,dist_from_back_plane);
    // console.log(intersectingplane);

    var normal = new Vector(0,0,0);
    
    switch(intersectingplane){
        case dist_from_left_plane: 
            normal = new Vector(-1,0,0); 
            break;
        case dist_from_right_plane: 
            normal = new Vector(1,0,0); 
            break;
        case dist_from_top_plane:
            normal = new Vector(0,1,0); 
            break;
        case dist_from_bottom_plane:
            normal = new Vector(0,-1,0); 
            break;
        case dist_from_front_plane:
            normal = new Vector(0,0,-1); 
            break;
        case dist_from_back_plane:
            normal = new Vector(0,0,1); 
            break;
    };

    // var temp = get_dist(lightVector.position,intersectionpoint);
    var L = generate_LVHVector(lightVector.position,intersectionpoint,"diff");
    // temp = get_dist(eye, intersectionpoint);
    var V = generate_LVHVector(eye, intersectionpoint,"diff");
    // temp = new Vector(V.x+L.x,V.y+L.y,V.z+L.z);
    var H = generate_LVHVector(V,L,"sum");

    var NL = get_dot_product(normal, L);
    var NH = get_dot_product(normal, H);
    var NH_n = Math.pow(NH,box.n);

    var red = Math.max(0, box.ambient[0] * lightVector.ambient) +
              Math.max(0, box.diffuse[0] * lightVector.diffuse * NL) +
              Math.max(0, box.specular[0] * lightVector.specular * NH_n);
    var green = Math.max(0, box.ambient[1] * lightVector.ambient) +
              Math.max(0, box.diffuse[1] * lightVector.diffuse * NL) +
              Math.max(0, box.specular[1] * lightVector.specular * NH_n);
    var blue = Math.max(0, box.ambient[2] * lightVector.ambient) +
              Math.max(0, box.diffuse[2] * lightVector.diffuse * NL) +
              Math.max(0, box.specular[2] * lightVector.specular * NH_n);

    return (new Color(red*255,green*255,blue*255,255));
}

function generate_LVHVector(v1,v2,action){
    if(action == "diff")
        var temp = get_dist(v1,v2);
    else
        var temp = new Vector(v1.x+v2.x,v1.y+v2.y,v1.z+v2.z);
    var dot = get_dot_product(temp,temp);
    var ld = 1/Math.sqrt(dot);
    var result = new Vector(ld*temp.x,ld*temp.y,ld*temp.z);
    return result;
}

function get_dot_product(v1,v2){
    var X = v1.x*v2.x;
    var Y = v1.y*v2.y;
    var Z = v1.z*v2.z;
    var temp = X+Y+Z;
    return temp;
}

function get_cross_product(v1,v2){
    var X = v1.y*v2.z - v1.z*v2.y;
    var Y = v1.z*v2.x - v1.x*v2.z;
    var Z = v1.x*v2.y - v1.y*v2.x;
    var temp = new Vector(X,Y,Z);
    return temp;
}

function get_scaled_vector(x,v1){
    var temp = new Vector(x*v1.x,x*v1.y,x*v1.z);
    return temp;
}

function sum_two_vectors(v1,v2){
    var temp = new Vector(v1.x+v2.x,v1.y+v2.y,v1.z+v2.z);
    return temp;
}

function get_vertex(center,window_width,window_height,right,up){
    var scaled1 = get_scaled_vector(window_height/2,up);
    var scaled2 = get_scaled_vector(window_width/2,right);
    var added = sum_two_vectors(scaled1,scaled2);
    var temp = sum_two_vectors(center,added);
    return temp;
    // return(sum_two_vectors(center, sum_two_vectors(get_scaled_vector(window_width/2,right),get_scaled_vector(window_height/2,up))));

}

function get_Corners(){
    var distance_from_eye = 0.5;
    var window_height = 1;
    var window_width = 1;

    var eye = new Vector(0.5,0.5,-0.5);
    var lookat = new Vector(0,0,1);
    var bg = new Color(0,0,0,255);
    var up = new Vector(0,1,0);

    var window_scale = get_scaled_vector(distance_from_eye,lookat);
    var right = get_cross_product(up,lookat);
    var center = sum_two_vectors(eye,window_scale);
    //create a window in a clockwise order of vertices
    var corners = {ul:get_vertex(center, -window_width,window_height,right,up),
        ur:get_vertex(center, window_width,window_height,right,up),
        lr:get_vertex(center, window_width,-window_height,right,up),
        ll:get_vertex(center, -window_width,-window_height,right,up)};
    return (corners);
}

function merge_vector(what,addto,v1,v2){
    var temp = get_dist(v1,v2);
    var scaled = new Vector(what*temp.x,what*temp.y,what*temp.z);
    var added = new Vector(addto.x+scaled.x,addto.y+scaled.y,addto.z+scaled.z);
    return added;
}

function get_dist(v1,v2){
    var temp = new Vector(v1.x-v2.x,v1.y-v2.y,v1.z-v2.z);
    return temp;
}

function raycast(context){
    var height = context.canvas.height;
    var width = context.canvas.width;
    var eye = new Vector(0.5,0.5,-0.5);
    var lookat = new Vector(0,0,1);
    var bg = new Color(0,0,0,255);
    var up = new Vector(0,1,0);
    var lightVector = {position: new Vector(-0.5, 1.5, -0.5), ambient:1, diffuse:1, specular:1};
    //initialized all the vectors now lets read in the number of boxes from the input file
    // var s,t;
    var inputBoxes = getInputBoxes();
    var no_of_boxes = inputBoxes.length;
    if(inputBoxes != String.null){
        var imagedata = context.createImageData(width,height);
        var corners = get_Corners();
        //traverse through each pixel
        var s,t;
        for(var i=0;i<width;i++){
            for(var j=0;j<height;j++){
                s = j/(height - 1);
                t = i/(width -1);
                // console.log("t and s:",t,s);
                
                var pl = merge_vector(s,corners.ul,corners.ll,corners.ul);
                // console.log("pl:",pl);
                var pr = merge_vector(s,corners.ur,corners.lr,corners.ur);
                // console.loglog("pr:",pr);
                var p = merge_vector(t,pl,pr,pl)
                // console.log("p:",p);
                var dist = get_dist(p,eye);
                for(var k=0; k<no_of_boxes; k++){
                    var Tlx = (inputBoxes[k].lx-eye.x)/dist.x;
                    var Trx = (inputBoxes[k].rx-eye.x)/dist.x;
                    var Tby = (inputBoxes[k].by-eye.y)/dist.y;
                    var Tty = (inputBoxes[k].ty-eye.y)/dist.y;
                    var Tfz = (inputBoxes[k].fz-eye.z)/dist.z;
                    var Trz = (inputBoxes[k].rz-eye.z)/dist.z;
        
                    var Tx0 = Math.min(Tlx,Trx);
                    var Tx1 = Math.max(Tlx,Trx);
                    var Ty0 = Math.min(Tby,Tty);
                    var Ty1 = Math.max(Tby,Tty);
                    var Tz0 = Math.min(Tfz,Trz);
                    var Tz1 = Math.max(Tfz,Trz);
        
                    var T0 = Math.max(Tx0,Ty0,Tz0);
                    var T1 = Math.min(Tx1,Ty1,Tz1);
                    // console.log("t0,t1:",T0,T1);
        
                    if(T0 <= T1){
                      var intersectx = eye.x + T0*(dist.x);
                      var intersecty = eye.y + T0*(dist.y);
                      var intersectz = eye.z + T0*(dist.z);
        
                      var intersectionpoint = new Vector(intersectx, intersecty, intersectz);
                      //pxColor = new Color(inputBoxes[k].diffuse[0]*255, inputBoxes[k].diffuse[1]*255, inputBoxes[k].diffuse[2]*255, 255);
                      //drawPixel(imagedata, i, j, pxColor);
                      bp_color = get_bp_color(eye,k, intersectionpoint,lightVector)
                      drawPixel(imagedata, i, j, bp_color);
                      break;
                    }else{
                      drawPixel(imagedata, i, j, bg);
                    }
                }
            }
        }
        context.putImageData(imagedata,0,0);
    }
}

function loop(context){
    window.requestAnimationFrame(loop);
    var height = document.documentElement.clientHeight;
    var width = document.documentElement.clientWidth;
    context.canvas.height = height;
    context.canvas.width = width;
    context.fillStyle = "#000000";
    context.fillRect(0, 0, width, height);
}

/* main -- here is where execution begins after window load */
function main() {

    // Get the canvas and context
    var canvas = document.getElementById("viewport"); 
    var context = canvas.getContext("2d");
    raycast(context);
    //loop(context);
 
    // Create the image
    //drawRandPixels(context);
      // shows how to draw pixels
    
    //drawRandPixelsInInputEllipsoids(context);
      // shows how to draw pixels and read input file
      
    //drawInputEllipsoidsUsingArcs(context);
      // shows how to read input file, but not how to draw pixels
    
    //drawRandPixelsInInputTriangles(context);
    // shows how to draw pixels and read input file
    
    //drawInputTrainglesUsingPaths(context);
    // shows how to read input file, but not how to draw pixels
    
    //drawRandPixelsInInputBoxes(context);
	// shows how to draw pixels and read input file
    
    //drawInputBoxesUsingPaths(context);
    
    // shows how to read input file, but not how to draw pixels
}