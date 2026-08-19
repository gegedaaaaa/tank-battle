(function(){
  "use strict";
  const ROT={up:0,right:Math.PI/2,down:Math.PI,left:-Math.PI/2};
  class Tank{
    constructor(game,x,y,options={}){this.game=game;this.x=x;this.y=y;this.w=30;this.h=30;this.team=options.team||"player";this.direction=options.direction||"up";this.speed=options.speed||125;this.baseSpeed=this.speed;this.hp=options.hp||1;this.maxHp=this.hp;this.power=options.power||1;this.fireRate=options.fireRate||.42;this.fireCooldown=0;this.alive=true;this.trackTime=0;this.shield=options.shield||0;this.flash=0;this.variant=options.variant||0;this.color=options.color||"green";this.spawnProtection=options.spawnProtection||0}
    get center(){return{x:this.x+this.w/2,y:this.y+this.h/2}}
    get rect(){return{x:this.x,y:this.y,w:this.w,h:this.h}}
    updateBase(dt){this.fireCooldown=Math.max(0,this.fireCooldown-dt);this.shield=Math.max(0,this.shield-dt);this.spawnProtection=Math.max(0,this.spawnProtection-dt);this.flash=Math.max(0,this.flash-dt);this.trackTime+=dt*this.speed*.08}
    move(direction,dt){
      this.direction=direction;const v=DirectionVectors[direction],amount=this.speed*dt;let nx=this.x+v.x*amount,ny=this.y+v.y*amount;
      // Align to lanes while turning to avoid sticky corners.
      if(v.x&&Math.abs((this.y+15)%32-16)<5)this.y=Math.round(this.y/32)*32+1;if(v.y&&Math.abs((this.x+15)%32-16)<5)this.x=Math.round(this.x/32)*32+1;
      nx=Math.max(1,Math.min(GameConfig.WIDTH-this.w-1,nx));ny=Math.max(1,Math.min(GameConfig.HEIGHT-this.h-1,ny));
      if(this.game.canTankOccupy(this,nx,ny)){this.x=nx;this.y=ny;return true}return false;
    }
    shoot(){if(!this.alive||this.fireCooldown>0)return null;const c=this.center,v=DirectionVectors[this.direction],offset=22;this.fireCooldown=this.fireRate;return new Bullet(this.game,this,c.x+v.x*offset,c.y+v.y*offset,this.direction,this.power)}
    takeDamage(amount){if(this.shield>0||this.spawnProtection>0)return false;this.hp-=amount;this.flash=.12;return this.hp<=0}
    draw(ctx){
      if(!this.alive)return;const c=this.center,player=this.team==="player";ctx.save();ctx.translate(c.x,c.y);ctx.rotate(ROT[this.direction]);if(this.flash>0)ctx.globalAlpha=.45;
      const palettes={green:["#87a936","#354717","#c8e45b"],blue:["#3e9acb","#1d4d69","#8ad8ff"],purple:["#78738f","#3d374d","#c6bedc"],pink:["#d98da6","#673f51","#ffd0dc"]};const selected=palettes[this.color]||palettes.green;const body=player?selected[0]:this.variant===2?"#f5bb36":this.variant===1?"#e8702d":"#d44738",dark=player?selected[1]:"#65231e",light=player?selected[2]:"#ffcf55";
      ctx.fillStyle="#161b18";ctx.fillRect(-15,-14,7,28);ctx.fillRect(8,-14,7,28);ctx.fillStyle="#55605a";for(let y=-12;y<13;y+=7){const off=(Math.floor(this.trackTime)%2)*2;ctx.fillRect(-14,y+off,5,4);ctx.fillRect(9,y+off,5,4)}
      ctx.fillStyle=dark;ctx.fillRect(-9,-14,18,28);ctx.fillStyle=body;ctx.fillRect(-8,-11,16,22);ctx.fillStyle=light;ctx.fillRect(-6,-10,12,4);ctx.fillStyle="#202923";ctx.fillRect(-3,-24,6,20);ctx.fillStyle=light;ctx.fillRect(-2,-25,4,13);
      ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fillStyle=body;ctx.fill();ctx.strokeStyle=light;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#121713";ctx.fillRect(-2,-3,4,6);ctx.restore();
      if(this.shield>0||this.spawnProtection>0){ctx.save();ctx.strokeStyle=`rgba(105,230,255,${.35+Math.sin(performance.now()*.012)*.2})`;ctx.lineWidth=2;ctx.shadowColor="#59dfff";ctx.shadowBlur=9;ctx.beginPath();ctx.arc(c.x,c.y,21,0,Math.PI*2);ctx.stroke();ctx.restore()}
      if(!player&&this.maxHp>1){ctx.fillStyle="#271716";ctx.fillRect(this.x+2,this.y-6,26,3);ctx.fillStyle="#ffb33c";ctx.fillRect(this.x+2,this.y-6,26*Math.max(0,this.hp/this.maxHp),3)}
    }
  }
  class PlayerTank extends Tank{
    constructor(game,x,y,color="green"){super(game,x,y,{team:"player",direction:"up",speed:142,spawnProtection:2.2,color});this.speedBoost=0}
    update(dt,keys){this.updateBase(dt);this.speedBoost=Math.max(0,this.speedBoost-dt);this.speed=this.baseSpeed*(this.speedBoost>0?1.38:1);let direction=null;if(keys.ArrowUp||keys.KeyW)direction="up";else if(keys.ArrowDown||keys.KeyS)direction="down";else if(keys.ArrowLeft||keys.KeyA)direction="left";else if(keys.ArrowRight||keys.KeyD)direction="right";if(direction)this.move(direction,dt);if(keys.Space){const bullet=this.shoot();if(bullet)this.game.addBullet(bullet)}}
  }
  window.Tank=Tank;window.PlayerTank=PlayerTank;
})();
