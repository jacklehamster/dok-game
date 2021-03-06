const ANIM_INDEX = 0;

class SpriteRenderer {
	constructor(bufferRenderer, shader, size) {
		this.attributes = shader.attributes;
		this.uniforms = shader.uniforms;
		this.bufferRenderer = bufferRenderer;
		this.size = size;
		this.tempMatrix = new Float32Array(16);
		this.tempQuat = quat.create();
		this.tempTranslation = vec3.create();
		this.tempScale = vec3.create();
		this.tempOrigin = vec3.create();
		this.updateTimes = new Float32Array([0, 0, 0, 0]);
	}

	makeMatrix(x, y, z, width, height, hotX, hotY, degreeRotation) {
		const [viewportWidth, viewportHeight] = this.size;
		return mat4.fromRotationTranslationScaleOrigin(
			this.tempMatrix,
			quat.fromEuler(this.tempQuat, 0, 0, degreeRotation || 0),
			vec3.set(this.tempTranslation, (x * 2 - viewportWidth), -(y * 2 - viewportHeight), z),
			vec3.set(this.tempScale, width, height, 1),
			vec3.set(this.tempOrigin, (hotX - width/2) / width * 2, -(hotY - height/2) / height * 2, 0)
		);		
	}

	setAttributeSprite(index, x, y, z, width, height, hotX, hotY, degreeRotation) {
		const attribute = this.attributes.matrix;
		const mat = this.makeMatrix(x, y, z, width, height, hotX, hotY, degreeRotation);
		this.bufferRenderer.setAttribute(attribute, index, mat);
	}

	setAnimation(index, anim, direction, opacity) {
		const { attributes } = this;
		if (anim) {
			this.bufferRenderer.setAttributeByte(attributes.textureIndex, index, anim.index);
			this.bufferRenderer.setAttribute(attributes.textureCoordinates, index, anim.getTextureCoordinates(direction, opacity));
			this.bufferRenderer.setAttribute(attributes.animationInfo, index, anim.getAnimationInfo());
			this.bufferRenderer.setAttribute(attributes.spriteSheet, index, anim.getSpritesheetInfo());
		}
	}

	setUpdateTime(index, sprite) {
		const { attributes } = this;
		this.updateTimes[ANIM_INDEX] = sprite.getAnimationTime();

		this.bufferRenderer.setAttribute(attributes.updateTime, index, this.updateTimes);
	}
}