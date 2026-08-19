(function(){
  "use strict";
  const TILE=32,COLS=26,ROWS=22;
  const T={EMPTY:0,BRICK:1,STEEL:2,GRASS:3,WATER:4,BASE:5,BASE_DEAD:6};
  class BattleMap{
    constructor(level=1){this.tileSize=TILE;this.cols=COLS;this.rows=ROWS;this.time=0;this.generate(level)}
    seeded(seed){let s=seed>>>0;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)}
    generate(level){
      const rnd=this.seeded(level*7919+1978);
      const baseChoice=[3+(level*7+2)%20,18+(level*5+1)%3];
      const playerChoice=[2+(level*9+4)%22,1+(level*7+2)%14];
      this.base={x:baseChoice[0],y:baseChoice[1],alive:true};this.playerSpawn={x:playerChoice[0]*TILE+1,y:playerChoice[1]*TILE+1};
      this.grid=Array.from({length:ROWS},()=>Array(COLS).fill(T.EMPTY));
      for(let y=1;y<ROWS-3;y++)for(let x=1;x<COLS-1;x++){
        if(this.isProtected(x,y))continue;
        const pattern=(x*3+y*5+level)%11;const r=rnd();
        if((x%4<2&&y%5<3&&pattern<7)||r<.105)this.grid[y][x]=T.BRICK;
        else if(r<.14&&y>3)this.grid[y][x]=T.STEEL;
        else if(r<.19&&y>4)this.grid[y][x]=T.WATER;
        else if(r<.27)this.grid[y][x]=T.GRASS;
      }
      // Main lanes and spawn zones remain readable and fair.
      for(let y=0;y<ROWS;y++){this.grid[y][0]=T.EMPTY;this.grid[y][COLS-1]=T.EMPTY;if(y%6===0)for(let x=0;x<COLS;x++)if(this.grid[y][x]!==T.STEEL)this.grid[y][x]=T.EMPTY}
      const px=Math.floor(this.playerSpawn.x/TILE),py=Math.floor(this.playerSpawn.y/TILE);for(let y=py-1;y<=py+1;y++)for(let x=px-1;x<=px+1;x++)if(this.inside(x,y))this.grid[y][x]=T.EMPTY;
      this.grid[this.base.y][this.base.x]=T.BASE;
      [[this.base.x-1,this.base.y-1],[this.base.x,this.base.y-1],[this.base.x+1,this.base.y-1],[this.base.x-1,this.base.y],[this.base.x+1,this.base.y],[this.base.x-1,this.base.y+1],[this.base.x+1,this.base.y+1]].forEach(([x,y])=>{if(this.inside(x,y)&&this.grid[y][x]!==T.BASE)this.grid[y][x]=T.BRICK});
      const points=[[1,1],[12,1],[24,1],[1,10],[24,10],[12,8]],shift=Math.floor(rnd()*points.length);this.spawnPoints=points.slice(shift).concat(points.slice(0,shift)).map(([x,y])=>({x:x*TILE+1,y:y*TILE+1}));
      this.spawnPoints.forEach(point=>{const sx=Math.floor(point.x/TILE),sy=Math.floor(point.y/TILE);for(let y=sy-1;y<=sy+1;y++)for(let x=sx-1;x<=sx+1;x++)if(this.inside(x,y)&&this.grid[y][x]!==T.BASE)this.grid[y][x]=T.EMPTY});
      this.signatureBricks=this.placeSignature(rnd);
    }
    placeSignature(rnd){
      const letters=["X","Q","G"],candidates=[],spawnTiles=this.spawnPoints.map(point=>({x:Math.floor(point.x/TILE),y:Math.floor(point.y/TILE)}));
      for(let y=6;y<=13;y++)for(let x=7;x<=this.cols-5;x++){
        const cells=[0,1,2].map(offset=>[x+offset,y]);
        if(cells.some(([cx,cy])=>!this.inside(cx,cy)||this.isProtected(cx,cy)||this.grid[cy][cx]===T.BASE||spawnTiles.some(tile=>Math.abs(tile.x-cx)<=1&&Math.abs(tile.y-cy)<=1)))continue;
        candidates.push({cells});
      }
      const chosen=candidates[Math.floor(rnd()*candidates.length)]||{cells:[[10,9],[11,9],[12,9]]};
      return chosen.cells.map(([x,y],index)=>{this.grid[y][x]=T.BRICK;return{x,y,letter:letters[index]}});
    }
    isProtected(x,y){const px=Math.floor(this.playerSpawn.x/TILE),py=Math.floor(this.playerSpawn.y/TILE);return Math.hypot(x-px,y-py)<=2||Math.hypot(x-this.base.x,y-this.base.y)<=2}
    inside(x,y){return x>=0&&x<this.cols&&y>=0&&y<this.rows}
    tileAtPixel(px,py){const x=Math.floor(px/TILE),y=Math.floor(py/TILE);return this.inside(x,y)?this.grid[y][x]:T.STEEL}
    isBlockingTile(type){return type===T.BRICK||type===T.STEEL||type===T.WATER||type===T.BASE||type===T.BASE_DEAD}
    rectBlocked(rect){
      const pad=4,minX=Math.floor((rect.x+pad)/TILE),maxX=Math.floor((rect.x+rect.w-pad-1)/TILE),minY=Math.floor((rect.y+pad)/TILE),maxY=Math.floor((rect.y+rect.h-pad-1)/TILE);
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(!this.inside(x,y)||this.isBlockingTile(this.grid[y][x]))return true;
      return false;
    }
    bulletHit(x,y,power){
      const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);if(!this.inside(tx,ty))return{hit:true,type:T.STEEL};const type=this.grid[ty][tx];
      if(type===T.BRICK){this.grid[ty][tx]=T.EMPTY;return{hit:true,destroyed:true,type}}
      if(type===T.STEEL){if(power>=3){this.grid[ty][tx]=T.EMPTY;return{hit:true,destroyed:true,type}}return{hit:true,type}}
      if(type===T.BASE){this.grid[ty][tx]=T.BASE_DEAD;this.base.alive=false;return{hit:true,destroyed:true,base:true,type}}
      if(type===T.BASE_DEAD)return{hit:true,type};return{hit:false,type};
    }
    update(dt){this.time+=dt}
    draw(ctx,layer="ground"){
      for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){const type=this.grid[y][x];if(layer==="ground"&&type!==T.GRASS)this.drawTile(ctx,type,x*TILE,y*TILE);if(layer==="cover"&&type===T.GRASS)this.drawTile(ctx,type,x*TILE,y*TILE)}
    }
    drawTile(ctx,type,x,y){
      if(type===T.EMPTY||type===T.GRASS){if(type===T.EMPTY)return}
      if(type===T.BRICK){ctx.fillStyle="#321b16";ctx.fillRect(x,y,TILE,TILE);for(let r=0;r<4;r++){for(let c=0;c<2;c++){ctx.fillStyle=(r+c)%2?"#a64d2d":"#823721";const ox=(r%2)*8;ctx.fillRect(x+c*16-ox,y+r*8,14,6)}}ctx.fillStyle="rgba(255,151,72,.18)";ctx.fillRect(x+2,y+2,28,2);this.drawSignature(ctx,x,y)}
      else if(type===T.STEEL){ctx.fillStyle="#4d5757";ctx.fillRect(x,y,32,32);ctx.fillStyle="#879390";ctx.fillRect(x+3,y+3,26,26);ctx.fillStyle="#bac3bc";ctx.fillRect(x+5,y+5,22,4);ctx.fillStyle="#36403f";ctx.fillRect(x+25,y+8,3,19);ctx.fillStyle="#dce4dd";[[7,8],[24,8],[7,24],[24,24]].forEach(p=>{ctx.beginPath();ctx.arc(x+p[0],y+p[1],2,0,Math.PI*2);ctx.fill()})}
      else if(type===T.WATER){ctx.fillStyle="#0a3445";ctx.fillRect(x,y,32,32);for(let i=0;i<3;i++){ctx.fillStyle=i===1?"#38a5b3":"#17657c";const o=Math.sin(this.time*2+i+x)*3;ctx.fillRect(x+o,y+6+i*9,24,3)}}
      else if(type===T.GRASS){ctx.fillStyle="rgba(28,62,31,.92)";ctx.fillRect(x,y,32,32);ctx.strokeStyle="#70a143";ctx.lineWidth=2;for(let i=3;i<31;i+=6){ctx.beginPath();ctx.moveTo(x+i,y+31);ctx.lineTo(x+i-3+(i%4),y+5+(i%9));ctx.stroke()}}
      else if(type===T.BASE||type===T.BASE_DEAD){if(type===T.BASE){const pulse=.5+.5*Math.sin(this.time*5);ctx.save();ctx.globalAlpha=.34+.34*pulse;ctx.strokeStyle="#ff3d3d";ctx.lineWidth=3;ctx.shadowColor="#ff2020";ctx.shadowBlur=14;ctx.beginPath();ctx.arc(x+16,y+16,22+pulse*3,0,Math.PI*2);ctx.stroke();ctx.restore()}ctx.fillStyle=type===T.BASE?"#a5af7a":"#49251f";ctx.fillRect(x+3,y+6,26,23);ctx.fillStyle=type===T.BASE?"#d8f34a":"#d34b35";ctx.beginPath();ctx.moveTo(x+16,y+4);ctx.lineTo(x+27,y+11);ctx.lineTo(x+23,y+27);ctx.lineTo(x+9,y+27);ctx.lineTo(x+5,y+11);ctx.closePath();ctx.fill();ctx.fillStyle="#172018";ctx.font="900 15px Consolas";ctx.textAlign="center";ctx.fillText(type===T.BASE?"★":"×",x+16,y+22)}
    }
    drawSignature(ctx,x,y){const mark=this.signatureBricks&&this.signatureBricks.find(item=>item.x===x/TILE&&item.y===y/TILE);if(!mark)return;ctx.save();ctx.strokeStyle="rgba(255,215,105,.62)";ctx.lineWidth=2;ctx.shadowColor="#ffd769";ctx.shadowBlur=9;ctx.beginPath();ctx.arc(x+16,y+16,14,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#ffe08a";ctx.font="900 22px Arial Black, sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.shadowColor="#fff0a8";ctx.shadowBlur=8;ctx.fillText(mark.letter,x+16,y+16);ctx.restore()}
  }
  window.GameConfig={TILE,COLS,ROWS,WIDTH:COLS*TILE,HEIGHT:ROWS*TILE,T};window.BattleMap=BattleMap;
})();
