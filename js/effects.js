(function(){
  "use strict";
  class Particle{constructor(x,y,color,speed=180,life=.5,size=4){const a=Math.random()*Math.PI*2,v=speed*(.35+Math.random()*.65);this.x=x;this.y=y;this.vx=Math.cos(a)*v;this.vy=Math.sin(a)*v;this.life=life*(.65+Math.random()*.6);this.max=this.life;this.size=size*(.5+Math.random());this.color=color}update(dt){this.life-=dt;this.x+=this.vx*dt;this.y+=this.vy*dt;this.vx*=.96;this.vy*=.96;return this.life>0}draw(ctx){ctx.globalAlpha=Math.max(0,this.life/this.max);ctx.fillStyle=this.color;ctx.fillRect(this.x-this.size/2,this.y-this.size/2,this.size,this.size);ctx.globalAlpha=1}}
  class FloatingText{constructor(x,y,text,color){this.x=x;this.y=y;this.text=text;this.color=color;this.life=1}update(dt){this.life-=dt;this.y-=28*dt;return this.life>0}draw(ctx){ctx.globalAlpha=this.life;ctx.fillStyle=this.color;ctx.font="900 14px Consolas";ctx.textAlign="center";ctx.fillText(this.text,this.x,this.y);ctx.globalAlpha=1}}
  class EffectsManager{constructor(){this.particles=[];this.texts=[];this.shake=0}burst(x,y,color="#ff9f32",count=22,power=190){for(let i=0;i<count;i++)this.particles.push(new Particle(x,y,i%3===0?"#fff2a3":color,power,.55,i%4===0?7:4));this.shake=Math.min(13,this.shake+count*.22)}spark(x,y,color="#eef4dc"){this.burst(x,y,color,7,100)}float(x,y,text,color="#d8f34a"){this.texts.push(new FloatingText(x,y,text,color))}update(dt){this.particles=this.particles.filter(p=>p.update(dt));this.texts=this.texts.filter(t=>t.update(dt));this.shake=Math.max(0,this.shake-dt*28)}offset(){return this.shake?{x:(Math.random()-.5)*this.shake,y:(Math.random()-.5)*this.shake}:{x:0,y:0}}draw(ctx){this.particles.forEach(p=>p.draw(ctx));this.texts.forEach(t=>t.draw(ctx))}}
  class SoundManager{
    constructor(){this.enabled=true;this.ctx=null;this.musicTimer=0;this.step=0;this.promptTimers=[]}
    ensure(){if(!this.ctx){const A=window.AudioContext||window.webkitAudioContext;if(A)this.ctx=new A()}if(this.ctx&&this.ctx.state==="suspended")this.ctx.resume()}
    tone(freq,duration=.08,type="square",volume=.04,slide=0){if(!this.enabled)return;this.ensure();if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),now=this.ctx.currentTime;o.type=type;o.frequency.setValueAtTime(freq,now);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),now+duration);g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(g).connect(this.ctx.destination);o.start(now);o.stop(now+duration)}
    shoot(){this.tone(150,.11,"square",.22,310)}
    explode(){this.tone(82,.24,"sawtooth",.09,-48)}
    pickup(){this.tone(520,.08,"square",.055,300);setTimeout(()=>this.tone(850,.1,"square",.04),65)}
    hit(){this.tone(260,.04,"square",.035,-80)}
    clearPrompts(){this.promptTimers.forEach(timer=>clearTimeout(timer));this.promptTimers=[]}
    startPrompt(){if(!this.enabled)return;this.clearPrompts();this.ensure();this.resetMusic();const notes=[[262,0,"sine"],[330,.18,"sine"],[392,.36,"triangle"],[523,.62,"triangle"],[659,.88,"sine"],[784,1.16,"sine"],[1046,1.78,"triangle"]];this.promptTimers=notes.map(([freq,delay,type],index)=>setTimeout(()=>this.tone(freq,index>4?.2:.17,type,index>4?.1:.08,index>4?90:40),delay*1000))}
    endPrompt(){if(!this.enabled)return;this.clearPrompts();this.ensure();this.resetMusic();const notes=[[392,0],[523,.22],[659,.46],[523,.72],[392,1.02],[262,1.42],[196,1.8]];this.promptTimers=notes.map(([freq,delay],index)=>setTimeout(()=>this.tone(freq,index>3?.28:.2,"triangle",index>3?.1:.08,-30),delay*1000))}
    resetMusic(){this.musicTimer=0;this.step=0}
    update(dt,running){if(!this.enabled||!running)return;this.musicTimer-=dt;if(this.musicTimer<=0){const notes=[523,659,784,659,587,698,880,698,622,784,988,784];this.tone(notes[this.step++%notes.length],.22,this.step%4===0?"triangle":"sine",.014);this.musicTimer=.28}}
  }
  window.EffectsManager=EffectsManager;window.SoundManager=SoundManager;
})();
