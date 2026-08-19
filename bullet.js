(function(){
  "use strict";
  const V={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
  class Bullet{
    constructor(game,owner,x,y,direction,power=1){this.game=game;this.owner=owner;this.team=owner.team;this.x=x;this.y=y;this.direction=direction;this.power=power;this.speed=power>=2?530:470;this.radius=4;this.alive=true;this.trail=[]}
    update(dt){
      const v=V[this.direction],distance=this.speed*dt,steps=Math.max(1,Math.ceil(distance/7)),step=distance/steps;
      for(let i=0;i<steps&&this.alive;i++){
        this.trail.push({x:this.x,y:this.y,life:.12});if(this.trail.length>8)this.trail.shift();this.x+=v.x*step;this.y+=v.y*step;
        if(this.x<0||this.y<0||this.x>GameConfig.WIDTH||this.y>GameConfig.HEIGHT){this.alive=false;break}
        const terrain=this.game.map.bulletHit(this.x,this.y,this.power);
        if(terrain.hit){this.alive=false;this.game.effects.spark(this.x,this.y,terrain.destroyed?"#ffad42":"#dfe8e3");this.game.sound.hit();if(terrain.base)this.game.destroyBase();break}
        const targets=this.team==="player"?this.game.enemies:(this.game.player&&this.game.player.alive?[this.game.player]:[]);
        for(const target of targets){if(target.alive&&this.x>target.x+3&&this.x<target.x+target.w-3&&this.y>target.y+3&&this.y<target.y+target.h-3){this.alive=false;this.game.hitTank(target,this.power,this.owner);break}}
      }
      this.trail.forEach(p=>p.life-=dt);this.trail=this.trail.filter(p=>p.life>0);
    }
    draw(ctx){
      const v=V[this.direction];for(let i=0;i<this.trail.length;i++){const p=this.trail[i];ctx.globalAlpha=(i+1)/this.trail.length*.22;ctx.fillStyle="#ffc84d";ctx.fillRect(p.x-2,p.y-2,4,4)}ctx.globalAlpha=1;
      ctx.save();ctx.shadowColor="#fff3a0";ctx.shadowBlur=14;ctx.fillStyle="#fff8ca";ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ff9d2e";ctx.fillRect(this.x-v.x*8-2,this.y-v.y*8-2,4,4);ctx.restore();
    }
  }
  window.Bullet=Bullet;window.DirectionVectors=V;
})();