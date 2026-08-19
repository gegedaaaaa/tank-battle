(function(){
  "use strict";
  const {WIDTH,HEIGHT}=GameConfig;
  const $=id=>document.getElementById(id);
  const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  class PowerUp{
    constructor(x,y,type){this.x=x;this.y=y;this.w=28;this.h=28;this.type=type;this.life=10;this.pulse=Math.random()*6}
    update(dt){this.life-=dt;this.pulse+=dt*5;return this.life>0}
    draw(ctx){const colors={fire:"#ff8b32",shield:"#4edbe8",speed:"#d8f34a",life:"#f34e58"},labels={fire:"F",shield:"◇",speed:"⚡",life:"+"};ctx.save();ctx.translate(this.x+14,this.y+14);ctx.globalAlpha=this.life<2?(.35+Math.sin(this.pulse*8)*.35):1;ctx.shadowColor=colors[this.type];ctx.shadowBlur=12;ctx.fillStyle="#101616";ctx.fillRect(-14,-14,28,28);ctx.strokeStyle=colors[this.type];ctx.lineWidth=2;ctx.strokeRect(-12,-12,24,24);ctx.fillStyle=colors[this.type];ctx.font="900 16px Consolas, sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(labels[this.type],0,1);ctx.restore()}
  }
  class Game{
    constructor(){
      this.canvas=$("gameCanvas");this.ctx=this.canvas.getContext("2d");this.ctx.imageSmoothingEnabled=false;this.effects=new EffectsManager();this.sound=new SoundManager();this.map=new BattleMap(1);this.keys={};this.state="menu";this.score=0;this.lives=3;this.level=1;this.highScore=this.loadHighScore();this.player=null;this.enemies=[];this.bullets=[];this.powerUps=[];this.spawnQueue=0;this.spawnTimer=0;this.respawnTimer=0;this.transitionTimer=0;this.selectedColor="green";this.firstBriefingShown=false;this.pendingStart=false;this.gameOverTimer=null;this.lastTime=performance.now();this.bindUI();this.updateHud();requestAnimationFrame(t=>this.loop(t));window.tankBattle=this;
    }
    loadHighScore(){try{return Number(localStorage.getItem("tankBattleHighScore"))||0}catch(e){return 0}}
    saveHighScore(){if(this.score>this.highScore){this.highScore=this.score;try{localStorage.setItem("tankBattleHighScore",String(this.highScore))}catch(e){}$("highScoreValue").textContent=this.formatScore(this.highScore)}}
    bindUI(){
      $("highScoreValue").textContent=this.formatScore(this.highScore);
      $("startButton").addEventListener("click",()=>this.requestNewGame());$("restartButton").addEventListener("click",()=>this.requestNewGame());$("resumeButton").addEventListener("click",()=>this.togglePause());
      $("helpButton").addEventListener("click",()=>this.showHelp(true));$("closeHelpButton").addEventListener("click",()=>this.closeHelp());
      $("pauseMenuButton").addEventListener("click",()=>this.returnToMenu());$("gameOverMenuButton").addEventListener("click",()=>this.returnToMenu());
      document.querySelectorAll(".color-option").forEach(button=>button.addEventListener("click",()=>{this.selectedColor=button.dataset.color;document.querySelectorAll(".color-option").forEach(option=>option.classList.toggle("selected",option===button))}));
      $("soundButton").addEventListener("click",()=>{this.sound.enabled=!this.sound.enabled;if(!this.sound.enabled){this.sound.clearPrompts();this.sound.resetMusic()}else this.sound.ensure();$("soundIcon").textContent=this.sound.enabled?"♪":"×";$("soundButton").setAttribute("aria-label",this.sound.enabled?"关闭声音":"开启声音")});
      addEventListener("keydown",e=>{if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();if(e.code==="KeyP"&&!e.repeat)this.togglePause();if(e.code==="Escape")this.closeHelp();this.keys[e.code]=true});
      addEventListener("keyup",e=>{this.keys[e.code]=false});addEventListener("blur",()=>{this.keys={};if(this.state==="playing")this.togglePause()});
    }
    showHelp(show){const panel=$("helpPanel");panel.classList.toggle("open",show);panel.setAttribute("aria-hidden",String(!show))}
    closeHelp(){this.showHelp(false);if(this.pendingStart){this.pendingStart=false;this.beginNewGame()}}
    hideScreens(){["startScreen","pauseScreen","gameOverScreen","levelScreen"].forEach(id=>$(id).classList.remove("active"));this.showHelp(false)}
    requestNewGame(){this.sound.ensure();if(!this.firstBriefingShown){this.firstBriefingShown=true;this.pendingStart=true;this.state="briefing";this.showHelp(true);return}this.beginNewGame()}
    beginNewGame(){if(this.gameOverTimer){clearTimeout(this.gameOverTimer);this.gameOverTimer=null}this.sound.clearPrompts();this.score=0;this.lives=3;this.level=1;this.startLevel(true)}
    startLevel(initial=false){
      this.hideScreens();this.map=new BattleMap(this.level);this.enemies=[];this.bullets=[];this.powerUps=[];this.effects=new EffectsManager();this.spawnQueue=Math.min(20,5+this.level*2);this.spawnTimer=.25;this.respawnTimer=0;this.player=new PlayerTank(this,this.map.playerSpawn.x,this.map.playerSpawn.y,this.selectedColor);this.updateHud();
      if(initial){this.state="starting";this.transitionTimer=2.05;this.sound.startPrompt()}else{$("levelAnnounce").textContent=String(this.level).padStart(2,"0");$("levelScreen").classList.add("active");this.state="transition";this.transitionTimer=2}
    }
    togglePause(){if(this.state==="playing"){this.state="paused";this.keys={};$("pauseScreen").classList.add("active")}else if(this.state==="paused"){this.state="playing";$("pauseScreen").classList.remove("active");this.lastTime=performance.now()}}
    formatScore(value){return Math.max(0,value).toString().padStart(6,"0")}
    updateHud(){
      $("scoreValue").textContent=this.formatScore(this.score);$("levelValue").textContent=String(this.level).padStart(2,"0");$("livesValue").textContent=this.lives>0?"I".repeat(Math.min(5,this.lives)):"—";
      const remaining=this.spawnQueue+this.enemies.filter(e=>e.alive).length;$("enemyPips").innerHTML="";for(let i=0;i<Math.min(16,remaining);i++)$("enemyPips").append(document.createElement("i"));
    }
    addBullet(bullet){const count=this.bullets.filter(b=>b.alive&&b.owner===bullet.owner).length,limit=bullet.team==="player"?(bullet.owner.power>=2?2:1):1;if(count>=limit)return;this.bullets.push(bullet);this.sound.shoot()}
    canTankOccupy(tank,x,y){const rect={x,y,w:tank.w,h:tank.h};if(this.map.rectBlocked(rect))return false;const entities=[this.player,...this.enemies].filter(Boolean);return !entities.some(other=>other!==tank&&other.alive&&overlap({x:x+2,y:y+2,w:tank.w-4,h:tank.h-4},{x:other.x+2,y:other.y+2,w:other.w-4,h:other.h-4}))}
    spawnEnemy(){
      const available=this.map.spawnPoints.filter(p=>!this.enemies.some(e=>e.alive&&Math.hypot(e.x-p.x,e.y-p.y)<42)&&(!this.player||Math.hypot(this.player.x-p.x,this.player.y-p.y)>55));if(!available.length)return false;
      const point=available[Math.floor(Math.random()*available.length)],roll=Math.random(),type=this.level>2&&roll<Math.min(.25,.05+this.level*.02)?2:(this.level>1&&roll<.45?1:0);this.enemies.push(new EnemyTank(this,point.x,point.y,this.level,type));this.spawnQueue--;this.effects.spark(point.x+15,point.y+15,"#ffcf55");this.updateHud();return true;
    }
    hitTank(target,power,owner){
      if(!target.alive)return;if(!target.takeDamage(power)){this.effects.spark(target.center.x,target.center.y,"#53ddeb");return}
      target.alive=false;this.effects.burst(target.center.x,target.center.y,target.team==="player"?"#a9d84d":"#ff673c",28,240);this.sound.explode();
      if(target.team==="enemy"){this.score+=target.scoreValue;this.effects.float(target.center.x,target.y,`+${target.scoreValue}`);if(Math.random()<.26)this.dropPowerUp(target.center.x-14,target.center.y-14);this.saveHighScore();this.updateHud()}
      else{this.lives--;this.updateHud();if(this.lives<=0)this.endGame();else this.respawnTimer=1.35}
    }
    dropPowerUp(x,y){const types=["fire","shield","speed","life"];this.powerUps.push(new PowerUp(Math.max(2,Math.min(WIDTH-30,x)),Math.max(2,Math.min(HEIGHT-30,y)),types[Math.floor(Math.random()*types.length)]))}
    collectPowerUp(item){if(!this.player)return;const names={fire:"火力强化",shield:"能量护盾",speed:"引擎增压",life:"生命 +1"};if(item.type==="fire"){this.player.power=Math.min(3,this.player.power+1);this.player.fireRate=Math.max(.2,this.player.fireRate-.07)}else if(item.type==="shield")this.player.shield=8;else if(item.type==="speed")this.player.speedBoost=10;else if(item.type==="life")this.lives=Math.min(5,this.lives+1);this.score+=50;this.sound.pickup();this.effects.float(item.x+14,item.y,names[item.type],"#d8f34a");this.updateHud()}
    respawnPlayer(){const spawn=this.map.playerSpawn,candidate=new PlayerTank(this,spawn.x,spawn.y,this.selectedColor);if(this.canTankOccupy(candidate,candidate.x,candidate.y)){this.player=candidate;this.effects.spark(spawn.x+15,spawn.y+15,"#d8f34a");this.respawnTimer=0}}
    destroyBase(){if(this.state!=="playing")return;this.effects.burst(this.map.base.x*32+16,this.map.base.y*32+16,"#ff3f32",42,280);this.sound.explode();this.endGame()}
    endGame(){if(this.state==="gameover")return;this.state="gameover";this.keys={};this.saveHighScore();this.sound.endPrompt();$("finalScoreValue").textContent=this.formatScore(this.score);this.gameOverTimer=setTimeout(()=>{$("gameOverScreen").classList.add("active");this.gameOverTimer=null},450)}
    returnToMenu(){if(this.gameOverTimer){clearTimeout(this.gameOverTimer);this.gameOverTimer=null}this.sound.clearPrompts();this.sound.resetMusic();this.pendingStart=false;this.state="menu";this.keys={};this.level=1;this.score=0;this.lives=3;this.map=new BattleMap(1);this.player=null;this.enemies=[];this.bullets=[];this.powerUps=[];this.effects=new EffectsManager();this.hideScreens();$("startScreen").classList.add("active");this.updateHud()}
    update(dt){
      this.map.update(dt);this.sound.update(dt,this.state==="playing");this.effects.update(dt);
      if(this.state==="starting"||this.state==="transition"){this.transitionTimer-=dt;if(this.transitionTimer<=0){this.state="playing";$("levelScreen").classList.remove("active");this.sound.resetMusic()}return}
      if(this.state!=="playing")return;
      if(this.player&&this.player.alive)this.player.update(dt,this.keys);else if(this.respawnTimer>0){this.respawnTimer-=dt;if(this.respawnTimer<=0)this.respawnPlayer()}
      this.spawnTimer-=dt;if(this.spawnQueue>0&&this.enemies.filter(e=>e.alive).length<Math.min(6,3+Math.floor(this.level/3))&&this.spawnTimer<=0){if(this.spawnEnemy())this.spawnTimer=Math.max(.48,1.4-this.level*.045);else this.spawnTimer=.25}
      this.enemies.forEach(e=>{if(e.alive)e.update(dt)});this.bullets.forEach(b=>{if(b.alive)b.update(dt)});
      // Opposing projectiles cancel each other instead of passing through.
      for(let i=0;i<this.bullets.length;i++)for(let j=i+1;j<this.bullets.length;j++){const a=this.bullets[i],b=this.bullets[j];if(a.alive&&b.alive&&a.team!==b.team&&Math.hypot(a.x-b.x,a.y-b.y)<9){a.alive=b.alive=false;this.effects.spark((a.x+b.x)/2,(a.y+b.y)/2)}}
      this.bullets=this.bullets.filter(b=>b.alive);this.enemies=this.enemies.filter(e=>e.alive);
      this.powerUps=this.powerUps.filter(p=>{if(!p.update(dt))return false;if(this.player&&this.player.alive&&overlap(p,this.player.rect)){this.collectPowerUp(p);return false}return true});
      if(this.spawnQueue===0&&this.enemies.length===0){this.level++;this.startLevel(false)}
    }
    drawBackdrop(ctx){ctx.fillStyle="rgba(12,20,16,.08)";ctx.fillRect(0,0,WIDTH,HEIGHT)}
    drawGrid(ctx){ctx.save();ctx.strokeStyle="rgba(231,244,219,.24)";ctx.lineWidth=1;for(let x=0;x<=WIDTH;x+=32){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,HEIGHT);ctx.stroke()}for(let y=0;y<=HEIGHT;y+=32){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(WIDTH,y+.5);ctx.stroke()}ctx.restore()}
    render(){
      const ctx=this.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,WIDTH,HEIGHT);const offset=this.effects.offset();ctx.save();ctx.translate(offset.x,offset.y);this.drawBackdrop(ctx);this.map.draw(ctx,"ground");this.powerUps.forEach(p=>p.draw(ctx));if(this.player)this.player.draw(ctx);this.enemies.forEach(e=>e.draw(ctx));this.bullets.forEach(b=>b.draw(ctx));this.map.draw(ctx,"cover");this.drawGrid(ctx);this.effects.draw(ctx);ctx.restore();
      const vignette=ctx.createRadialGradient(WIDTH/2,HEIGHT/2,HEIGHT*.25,WIDTH/2,HEIGHT/2,HEIGHT*.72);vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(1,"rgba(0,0,0,.34)");ctx.fillStyle=vignette;ctx.fillRect(0,0,WIDTH,HEIGHT);
    }
    loop(time){const dt=Math.min(.034,Math.max(0,(time-this.lastTime)/1000));this.lastTime=time;this.update(dt);this.render();requestAnimationFrame(t=>this.loop(t))}
  }
  addEventListener("DOMContentLoaded",()=>new Game());
})();
