class TextureAtlas {
	constructor(gl, glTextures, index, width, height, textureSize, imageLoader, chrono) {
		this.gl = gl;
		this.glTextures = glTextures;
		this.index = index || 0;
		this.maxTextureIndex = 0;
		this.x = 0;
		this.y = 0;
		this.textureSize = textureSize;
		this.canvas = document.createElement("canvas");
		this.imageLoader = imageLoader;
		this.spriteWidth = 0;
		this.spriteHeight = 0;
		this.startIndex = 0;
		this.endIndex = 0;
		this.chrono = chrono;

		this.tempMatrix = new Float32Array([
			0, 0, 0, 0,
			0, 0, 0, 0,
			0, 0, 0, 0,
			0, 0, 0, 0,
		]);
		this.shortVec4 = new Uint16Array(4);
		this.floatVec4 = new Float32Array(4);
	}

	textureMix(image, texture, texture_alpha, texture_blend) {
		const { canvas } = this;
		const context = canvas.getContext("2d");
		if (canvas !== image) {
			this.getCanvasImage(image);
		}
		context.globalCompositeOperation = texture_blend || "source-atop";
		context.globalAlpha = texture_alpha || .5;

		const scale = Math.max(1, Math.max((image.naturalWidth || image.width) / texture.naturalWidth, (image.naturalHeight || image.height) / texture.naturalHeight));
		context.drawImage(texture, 0, 0, texture.naturalWidth, texture.naturalHeight, 0, 0, texture.naturalWidth * scale, texture.naturalHeight * scale);

		context.globalCompositeOperation = "";
		context.globalAlpha = 1;
		return canvas;
	}

	getCanvasImage(image) {
		const { canvas } = this;
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;

		const context = canvas.getContext("2d");
		context.imageSmoothingEnabled = false;
		context.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, canvas.width, canvas.height);
		return canvas;
	}


	getSpriteImageForFrame(image, frame) {
		if (this.cols === 1 && this.rows === 1) {
			return image;
		}
		const { spriteWidth, spriteHeight } = this;
		const col = frame % this.cols;
		const row = Math.floor(frame / this.cols);
		const { canvas } = this;
		canvas.width = spriteWidth;
		canvas.height = spriteHeight;

		const context = canvas.getContext("2d");
		context.imageSmoothingEnabled = false;
		context.drawImage(image, col * spriteWidth, row * spriteHeight, spriteWidth, spriteHeight,
			0, 0, canvas.width, canvas.height);
		return canvas;
	}

	async setImage(animationData) {
		const { url, collision_url, collision_padding, texture_url, texture_alpha, texture_blend } = animationData;
		const image = url ? await this.imageLoader.loadImage(url) : null;
		this.onUpdateImage(image, animationData || {});

		const { spriteWidth, spriteHeight } = this;
		const { gl, glTextures, index, x, y } = this;
		if (index >= 0) {
			for (let frame = this.startFrame; frame <= this.endFrame; frame++) {
				const spriteImage = this.getSpriteImageForFrame(image, frame);
				const blendedImage = texture_url ? this.textureMix(spriteImage, await this.imageLoader.loadImage(texture_url), texture_alpha, texture_blend) : spriteImage;
				if (!blendedImage) {
					continue;
				}

				const col = frame % this.cols;
				const row = Math.floor(frame / this.cols);
				this.saveTexture(index, x + col * spriteWidth, y + row * spriteHeight, blendedImage);
			}
		}

		this.chrono.tick(`Done loading image: ${url}`);
		if (collision_url) {
			this.collisionBoxes = await this.calculateCollisionBoxes(collision_url);
			this.chrono.tick(`Done loading collision image: ${collision_url}`);
		} else {
			this.collisionBoxes = [];
		}

		this.canvas.width = 0;
		this.canvas.height = 0;
		this.collisionPadding = collision_padding;

		return this;
	}

	async calculateCollisionBoxes(collision_url) {
		const { canvas } = this;
		const collisionBoxes = [];
		const collisionImage = await this.imageLoader.loadImage(collision_url);
		canvas.width = collisionImage.naturalWidth;
		canvas.height = collisionImage.naturalHeight;
		const context = canvas.getContext("2d");
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(collisionImage, 0, 0);

		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				const cellWidth = canvas.width / this.cols;
				const cellHeight = canvas.height / this.rows;
				const cellX = col * cellWidth;
				const cellY = row * cellHeight;
				const top = this.getTop(context, cellX, cellY, cellWidth, cellHeight) / cellHeight;
				if (top < 0) {
					continue;
				}
				const bottom = (this.getBottom(context, cellX, cellY, cellWidth, cellHeight) + 1) / cellHeight;
				const left = this.getLeft(context, cellX, cellY, cellWidth, cellHeight) / cellWidth;
				const right = (this.getRight(context, cellX, cellY, cellWidth, cellHeight) + 1) / cellWidth;
				if (top >= 0 && bottom >= 0 && left >= 0 && right >= 0) {
					collisionBoxes[row * this.cols + col] = {
						top, left, bottom, right,
					};
				}
			}
		}
		return collisionBoxes;
	}

	getCollisionBoxNormalized(frame) {
		return this.collisionBoxes[frame];
	}

	getTop(context, x, y, width, height) {
		for (let top = 0; top < height; top ++) {
			const pixels = context.getImageData(x, y + top, width, 1).data;
			if (this.hasOpaquePixel(pixels)) {
				return top;
			}
		}
		return -1;
	}

	getBottom(context, x, y, width, height) {
		for (let bottom = height-1; bottom >=0; bottom --) {
			const pixels = context.getImageData(x, y + bottom, width, 1).data;
			if (this.hasOpaquePixel(pixels)) {
				return bottom;
			}
		}
		return -1;
	}

	getLeft(context, x, y, width, height) {
		for (let left = 0; left < width; left ++) {
			const pixels = context.getImageData(x + left, y, 1, height).data;
			if (this.hasOpaquePixel(pixels)) {
				return left;
			}
		}
		return -1;		
	}

	getRight(context, x, y, width, height) {
		for (let right = width-1; right >=0; right--) {
			const pixels = context.getImageData(x + right, y, 1, height).data;
			if (this.hasOpaquePixel(pixels)) {
				return right;
			}
		}
		return -1;
	}

	hasOpaquePixel(pixels) {
		for (let i = 0; i < pixels.length; i+= 4) {
			if (pixels[i + 3]) {
				return true;
			}
		}
		return false;
	}

	saveTexture(index, x, y, canvas) {
		const { textureSize, glTextures, gl } = this;
		this.maxTextureIndex = Math.max(index, this.maxTextureIndex);
		gl.activeTexture(gl[`TEXTURE${index}`]);
		const glTexture = glTextures[index];
		if (glTexture.width < textureSize || glTexture.height < textureSize) {
			gl.bindTexture(gl.TEXTURE_2D, glTexture.glTexture);
			glTexture.width = glTexture.height = textureSize;
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, glTexture.width, glTexture.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	  		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	  		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	  		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
		}
		gl.texSubImage2D(gl.TEXTURE_2D, 0, x || 0, y || 0, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
		gl.generateMipmap(gl.TEXTURE_2D);		
	}

	onUpdateImage(image, animationData) {
		this.spriteSheetWidth = image ? image.naturalWidth : 0;
		this.spriteSheetHeight = image ? image.naturalHeight : 0;
		const { cols, rows, frameRate, range, firstFrame, direction } = animationData;
		this.frameRate = frameRate || 1;
		this.cols = cols || 1;
		this.rows = rows || 1;
		this.spriteWidth = this.spriteSheetWidth / this.cols;
		this.spriteHeight = this.spriteSheetHeight / this.rows;
		this.startFrame = (range ? range[0] : 0) || 0;
		this.endFrame = (range ? range[1] : 0) || this.startFrame;
		this.firstFrame = Math.max(this.startFrame, Math.min(this.endFrame, firstFrame || this.startFrame));
		this.direction = direction || 1;
	}

	getTextureCoordinatesFromRect(x, y, width, height, direction, opacity) {
		let x0 = x;
		let x1 = x + width;
		if (direction * this.direction < 0) {
			x0 = x + width;
			x1 = x;
		}

		const { tempMatrix } = this;
		tempMatrix[0]  = x0; tempMatrix[1]  = y + height;
		tempMatrix[4]  = x1; tempMatrix[5]  = y + height;
		tempMatrix[8]  = x0; tempMatrix[9]  = y;
		tempMatrix[12] = x1; tempMatrix[13] = y;

		tempMatrix[2] = tempMatrix[6] = tempMatrix[10] = tempMatrix[14] = opacity * 1000;
		return this.tempMatrix;
	}

	getTextureCoordinates(direction, opacity) {
		const { x, y, spriteWidth, spriteHeight } = this;
		return this.getTextureCoordinatesFromRect(x, y, spriteWidth, spriteHeight, direction, opacity);
	}

	getSpritesheetInfo() {
		const { shortVec4 } = this;
		shortVec4[0] = this.cols;
		shortVec4[1] = this.rows;
		shortVec4[2] = 0;
		shortVec4[3] = 0;
		return shortVec4;
	}

	getAnimationInfo() {
		const { floatVec4 } = this;
		floatVec4[0] = this.startFrame;
		floatVec4[1] = this.endFrame;
		floatVec4[2] = this.frameRate;
		floatVec4[3] = 0;
		return floatVec4;
	}
}