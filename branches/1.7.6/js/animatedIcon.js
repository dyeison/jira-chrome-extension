function AnimatedIcon(_src){
	var animationFrames = 36,
		animationSpeed = 10,
		canvas = document.createElement('canvas'),
		canvasContext = canvas.getContext('2d'),
		rotation = 0,
		image = new Image()
		self = this;
	image.src = _src;

	this.play = function(bInAction) {
		if(rotation==0 || bInAction){
			
		  rotation += 1/animationFrames;
		  self.drawIconAtRotation();
		  if (rotation <= 1) {
			setTimeout(function(){
				self.play(1)
			}, animationSpeed);
		  } else {
			rotation = 0;
			self.drawIconAtRotation();
		  }
		 }
	};

	this.drawIconAtRotation = function() {
		function ease(x) {
		  return (1-Math.sin(Math.PI/2+x*Math.PI))/2;
		}
	  canvasContext.save();
	  canvasContext.clearRect(0, 0, image.width, image.height);
	  canvasContext.translate(
		  Math.ceil(image.width/2),
		  Math.ceil(image.height/2));
	  canvasContext.rotate(2*Math.PI*ease(rotation));
	  canvasContext.drawImage(image,
		  -Math.ceil(image.width/2),
		  -Math.ceil(image.height/2));
	  canvasContext.restore();
	  chrome.browserAction.setIcon({imageData:canvasContext.getImageData(0, 0,
		  image.width,image.height)});
	};
}