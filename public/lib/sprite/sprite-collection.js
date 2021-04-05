/*
 	Class for combining Sprite.
*/

class SpriteCollection {
	constructor(engine) {
		this.sprites = [];
		this.engine = engine;
	}

	create(data, attributes, spriteData) {
		const sprite = new Sprite(data, this.engine.lastTime, spriteData);
		this.sprites.push(sprite);
		

		for (let i in attributes) {
			sprite[i] = attributes[i];
		}
		return sprite;
	}

	postCreate() {
		this.sprites.forEach(sprite => {
			for (let key in sprite.properties) {
				sprite.onUpdate(key, sprite.properties[key], true);
			}
		});
	}

	get(index) {
		return this.sprites[index];
	}

	size() {
		return this.sprites.length;
	}

	clear() {
		this.sprites.length = 0;
	}
}