/** Capacidade total de kits de canto, conforme as duas laterais da descrição. */
export function capacidadeKitCantoBox(kit:{nome:string;largura?:number}):number {
 const nome=kit.nome.toLowerCase().replace(/×/g,'x');
 const medidas=nome.match(/\b\d{2,3}\s*x\s*(\d{2,3})\s*x\s*(\d{2,3})\b/);
 if(medidas)return (Number(medidas[1])+Number(medidas[2]))*10;
 const c1=nome.match(/\bc\s*1\s*[- ]?\s*(100|120|150)\b/);
 if(c1)return Number(c1[1])*20;
 return Number(kit.largura||0);
}
export function modeloKitCantoBox(kit:{nome:string;categoria?:string|null},modelo:string):boolean {
 const nome=`${kit.nome} ${kit.categoria||''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const canto=/\bc\s*1(?:\b|(?=100|120|150))/.test(nome)||nome.includes('canto');
 if(!canto)return false;
 const m=modelo.toLowerCase();
 if(m.includes('tradicional'))return !/quadrado|evid|elegance/.test(nome);
 if(m.includes('quadrado'))return nome.includes('quadrado');
 return /evid|elegance/.test(nome);
}
