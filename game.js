'use strict';
class Vector{

  constructor (x = 0, y = 0) {
      this.x = x;
      this.y = y;
  }

  plus(vector) {
		if (vector instanceof Vector) {
			return new Vector(vector.x + this.x, vector.y + this.y);
		}
		else {
			throw new Error ('Можно прибавлять к вектору только вектор типа Vector');
		}
	}

  times(n){
    return new Vector(this.x * n, this.y * n);
  }
}

class Actor{
  constructor(pos = new Vector(0,0), size = new Vector(1,1), speed = new Vector(0,0)){

    if (pos instanceof Vector && size instanceof Vector && speed instanceof Vector) {
      this.pos = pos;
      this.size = size;
      this.speed = speed;
    } else {
      throw new Error('arguments error');
    }
  }

  act() {
  }

  get left() {
    return this.pos.x;
  }

  get top() {
    return this.pos.y;
  }

  get right() {
    return this.pos.x + this.size.x;
  }

  get bottom() {
    return this.pos.y + this.size.y;
  }


  get type() {
    return 'actor';
  }

  isIntersect(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error('arguments error');
    }
    if ((actor === this) || (actor.left >= this.right) || (actor.right <= this.left) || (actor.top >= this.bottom) || (actor.bottom <= this.top)) {
       return false;
    }
    return true;
  }
}

class Level {
  constructor(grid = [], actors = []) {
      this.grid = grid.slice();
      this.actors = actors.slice();
      this.status = null;
      this.finishDelay = 1;
      this.height = this.grid.length;
      this.width = Math.max(0, ...this.grid.map(element => element.length));
  }
  
  get player() {
    return this.actors.find(actor => actor.type === 'player');
  }

  isFinished(){
     return this.status !== null && this.finishDelay < 0 ? true : false;
  }

  actorAt(actor){
    if (!(actor instanceof Actor)) {
      throw new Error('arguments error');
    }
    return this.actors.find(el => el.isIntersect(actor));
  }

  obstacleAt(pos, size){
    if (!(pos instanceof Vector) || !(size instanceof Vector)) {
      throw Error('arguments error');
    }

    let xStart = Math.floor(pos.x);
    let xEnd   = Math.ceil(pos.x + size.x);
    let yStart = Math.floor(pos.y);
    let yEnd   = Math.ceil(pos.y + size.y);

    if (xStart < 0 || xEnd > this.width || yStart < 0) {
      return 'wall';
    }

    if (yEnd > this.height) {
      return 'lava';
    }
    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        if (this.grid[y][x]) {
          return this.grid[y][x];
        }
      }
    }
  }

  removeActor(actor){
   this.actors = this.actors.filter(el => el !== actor);
  }

  noMoreActors(type){
    const result = this.actors.filter(el => el.type === type);
    return result.length > 0 ? false : true;
  }

  playerTouched(type, actor) {
   if (this.status !== null) {
     return;
   }
   if (type === 'lava' || type === 'fireball') {
     this.status = 'lost';
   } else if (type === 'coin') {
     this.removeActor(actor);
     if (!this.actors.find(el => el.type === 'coin')) {
       this.status = 'won';
     }
   }
 }
}

class LevelParser{
  constructor(lists){
    this.lists = lists;
  }

  actorFromSymbol(list){
    return list ? this.lists[list] : undefined;
  }

  obstacleFromSymbol(list){
    switch(list) {
      case 'x' : return 'wall';
      case '!' : return 'lava';
      default  : return undefined;
    }
  }

  createGrid(plan){
    return plan.map(el => {
      return el.split('').map(item => this.obstacleFromSymbol(item));
    });
  }

  createActors(plan){
    const mas = plan.map(el => el.split(''));
    const actors = [];
    mas.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (this.lists && this.lists[cell] && typeof this.lists[cell] === 'function') {
          const actor = new this.lists[cell] (new Vector(x, y));
          if (actor instanceof Actor) {
              actors.push(actor);
          }
        }
      });
    });
    return actors;
  }

  parse(plan){
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Player extends Actor{
  constructor(pos=new Vector(0,0)){
  	super();
    this.size = new Vector(0.8,1.5);
    this.speed = new Vector(0,0);
    this.pos = new Vector(pos.x, pos.y-0.5);
  }

  get type(){
    return 'player';
  }
}

class Fireball extends Actor{
  constructor(pos, speed){
    super(pos);
    this.size = new Vector(1,1);
    this.speed = speed;
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1){
    return new Vector(this.pos.x + time * this.speed.x, this.pos.y + time*this.speed.y);
  }

  handleObstacle(){
    this.speed.x = -this.speed.x;
    this.speed.y = -this.speed.y;
  }

  act(time, level){
    let nextPos = this.getNextPosition(time);
    if (level.obstacleAt(nextPos, this.size) !== undefined){
      this.handleObstacle();
    } else {
      this.pos = nextPos;
    }
  }
}

class HorizontalFireball extends Fireball{
  constructor(pos){
  	super();
    this.size = new Vector(1,1);
    this.speed = new Vector(2,0);
  }
}

class VerticalFireball extends Fireball{
  constructor(pos){
  	super();
    this.size = new Vector(1,1);
    this.speed = new Vector(0,2);
  }
}


class FireRain extends Fireball{
  constructor(pos){
  	super();
    this.size = new Vector(1,1);
    this.speed = new Vector(0,3);
    this.startPos = pos;
  }

  handleObstacle(){
    this.pos = this.startPos;
  }
}

class Coin extends Actor{
  constructor(pos=new Vector(0,0)){
    super(pos);
    
    this.size = new Vector(0.6,0.6);
    this.pos = new Vector(pos.x+0.2, pos.y+0.1);
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random()*(2*Math.PI);
    this.basePos = this.pos;
  }

  get type(){
    return'coin';
  }

  updateSpring(time = 1){
    this.spring = this.spring + this.springSpeed * time;
  }

  getSpringVector(){
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1){
    this.updateSpring(time);
    return  this.basePos.plus(this.getSpringVector());
  }

  act(time){
    this.pos = this.getNextPosition(time);
  }
}

const actorDict = {
  '@': Player,
  'v': FireRain,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'o': Coin
};

const parser = new LevelParser(actorDict);

loadLevels()
    .then((res) => {
      runGame(JSON.parse(res), parser, DOMDisplay)
        .then(() => alert("you won!"))
    });


