/******************************************************************************
Copyright (c) 2011 Jake Gordon and contributors
https://github.com/jsmarkus/node-bin-packing
Modified for use with µCSS by Meinolf Amekudzi 2012-2013

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


This is a binary tree based bin packing algorithm that is more complex than
the simple Packer (packer.js). Instead of starting off with a fixed width and
height, it starts with the width and height of the first block passed and then
grows as necessary to accomodate each subsequent block. As it grows it attempts
to maintain a roughly square ratio by making 'smart' choices about whether to
grow right or down.

When growing, the algorithm can only grow to the right OR down. Therefore, if
the new block is BOTH wider and taller than the current target then it will be
rejected. This makes it very important to initialize with a sensible starting
width and height. If you are providing sorted input (largest first) then this
will not be an issue.

A potential way to solve this limitation would be to allow growth in BOTH
directions at once, but this requires maintaining a more complex tree
with 3 children (down, right and center) and that complexity can be avoided
by simply chosing a sensible starting block.

Best results occur when the input blocks are sorted by height, or even better
when sorted by max(width,height).

Inputs:
------

blocks: array of any objects that have .w and .h attributes

Outputs:
-------

marks each block that fits with a .fit attribute pointing to a
node with .x and .y coordinates

Example:
-------

var blocks = [
{ w: 100, h: 100 },
{ w: 100, h: 100 },
{ w: 80, h: 80 },
{ w: 80, h: 80 },
etc
etc
];

var packer = new GrowingPacker();
packer.fit(blocks);

for(var n = 0 ; n < blocks.length ; n++) {
var block = blocks[n];
if (block.fit) {
Draw(block.fit.x, block.fit.y, block.w, block.h);
}
}


******************************************************************************/

GrowingPacker = function() { };

GrowingPacker.prototype = {

  fit: function(blocks) {
    var n, node, block, len = blocks.length;
    var w = len > 0 ? blocks[0].w : 0;
    var h = len > 0 ? blocks[0].h : 0;
    this.root = { x: 0, y: 0, w: w, h: h };
    for (n = 0; n < len ; n++) {
      block = blocks[n];
      if (node = this.findNode(this.root, block.w, block.h))
        block.fit = this.splitNode(node, block.w, block.h);
      else
        block.fit = this.growNode(block.w, block.h);
    }
  },

  findNode: function(root, w, h) {
    if (root.used)
      return this.findNode(root.right, w, h) || this.findNode(root.down, w, h);
    else if ((w <= root.w) && (h <= root.h))
      return root;
    else
      return null;
  },

  splitNode: function(node, w, h) {
    node.used = true;
    node.down = { x: node.x, y: node.y + h, w: node.w, h: node.h - h };
    node.right = { x: node.x + w, y: node.y, w: node.w - w, h: h };
    return node;
  },

  growNode: function(w, h) {
    var canGrowDown = (w <= this.root.w);
    var canGrowRight = (h <= this.root.h);

    var shouldGrowRight = canGrowRight && (this.root.h >= (this.root.w + w)); // attempt to keep square-ish by growing right when height is much greater than width
    var shouldGrowDown = canGrowDown && (this.root.w >= (this.root.h + h)); // attempt to keep square-ish by growing down when width is much greater than height

    if (shouldGrowRight)
      return this.growRight(w, h);
    else if (shouldGrowDown)
      return this.growDown(w, h);
    else if (canGrowRight)
     return this.growRight(w, h);
    else if (canGrowDown)
      return this.growDown(w, h);
    else
      return null; // need to ensure sensible root starting size to avoid this happening
  },

  growRight: function(w, h) {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      w: this.root.w + w,
      h: this.root.h,
      down: this.root,
      right: { x: this.root.w, y: 0, w: w, h: this.root.h }
    };
    if (node = this.findNode(this.root, w, h))
      return this.splitNode(node, w, h);
    else
      return null;
  },

  growDown: function(w, h) {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      w: this.root.w,
      h: this.root.h + h,
      down: { x: 0, y: this.root.h, w: this.root.w, h: h },
      right: this.root
    };
    if (node = this.findNode(this.root, w, h))
      return this.splitNode(node, w, h);
    else
      return null;
  }

}


var BitPackEffectivity;
var BitPackOptimumArea;

function BitPackRect(_n,_w,_h){
	this.n=_n;
	this.x=0.0;
	this.y=0.0;
}

function _BitPack(_bitpackrects){
var l=_bitpackrects.length,i,k=l*10;
var packer=new GrowingPacker();
var old,a,b,OldBitPackRects=new Array(),ok,OldBitPackEffectivity,bitpackrects=new Array();
var o,maxx=0,maxy=0;
	
	for(i=0;i<l;i++){
		o=new Object();
		o.fit=new Object();
		o.fit.x=_bitpackrects[i].x;
		o.fit.y=_bitpackrects[i].y;
		o.x=_bitpackrects[i].x;
		o.y=_bitpackrects[i].y;
		o.w=_bitpackrects[i].w;
		o.h=_bitpackrects[i].h;
		OldBitPackRects[i]=o;
	};
	
	//for(i=0;i<l;i++)OldBitPackRects[i]=_bitpackrects[i];
	for(i=0;i<l;i++)bitpackrects[i]=_bitpackrects[i];
	k=bitpackrects.length*10;
	for(i=0;i<k;i++){
		a=IntRnd(0,bitpackrects.length-1);
		b=IntRnd(0,bitpackrects.length-1);
		old=bitpackrects[a];
		bitpackrects[a]=bitpackrects[b];
		bitpackrects[b]=old;
	};
	
	packer.fit(bitpackrects);
	OldBitPackEffectivity=BitPackEffectivity;
	BitPackEffectivity=Math.round(BitPackOptimumArea/(packer.root.w*packer.root.h)*100);
	
	ok=true;
	for(i=0;i<l;i++)if(!bitpackrects[i].fit)ok=false;
	
	if(OldBitPackEffectivity>=BitPackEffectivity||!ok){
		for(i=0;i<l;i++)bitpackrects[i]=OldBitPackRects[i];
		//packer.fit(bitpackrects);
		maxx=0;
		maxy=0;
		for(i=0;i<l;i++){
			if(bitpackrects[i].fit){
				if(bitpackrects[i].x+bitpackrects[i].w>maxx)maxx=bitpackrects[i].x+bitpackrects[i].w;
				if(bitpackrects[i].y+bitpackrects[i].h>maxy)maxy=bitpackrects[i].y+bitpackrects[i].h;
			};
		};
		BitPackEffectivity=Math.round(BitPackOptimumArea/(maxx*maxy)*100);
	};
	maxx=0;
	maxy=0;
	for(i=0;i<l;i++){
		if(bitpackrects[i].fit){
			bitpackrects[i].x=bitpackrects[i].fit.x;
			bitpackrects[i].y=bitpackrects[i].fit.y;
			if(bitpackrects[i].x+bitpackrects[i].w>maxx)maxx=bitpackrects[i].x+bitpackrects[i].w;
			if(bitpackrects[i].y+bitpackrects[i].h>maxy)maxy=bitpackrects[i].y+bitpackrects[i].h;
		};
	};
	//return [packer.root.w,packer.root.h];
	return [maxx,maxy];
};

function BitPack(_bitpackrects){
var l=_bitpackrects.length,i,ret,j=0;
	while(j<4){
		BitPackEffectivity=0;
		BitPackOptimumArea=0;
		for(i=0;i<l;i++)BitPackOptimumArea+=_bitpackrects[i].w*_bitpackrects[i].h;
		var d=new Date(),start=d.getUTCMilliseconds();
		for(i=0;i<1000;i++){
			d=new Date();
			if(((d.getUTCMilliseconds()-start)/1000/60)>5)return ret;
			ret=_BitPack(_bitpackrects);
		};
		j++;
		if(BitPackOptimumArea<=ret[0]*ret[1])j=5;
	};
	return ret;
}