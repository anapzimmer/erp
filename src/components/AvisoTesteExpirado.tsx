const mensagem = "Olá! Meu prazo de teste do Glass Code expirou. Gostaria de falar com o suporte para continuar usando o sistema.";
const whatsapp = "https://wa.me/5546988271599?text=" + encodeURIComponent(mensagem);

export default function AvisoTesteExpirado() {
  return <div className="mt-4">
    <p className="text-sm leading-6 text-text-secondary">Seu prazo de teste expirou. Para continuar usando o sistema, fale com nosso suporte pelo WhatsApp.</p>
    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex rounded-lg bg-primary px-4 py-3 text-sm font-medium text-on-primary">
      Chamar suporte no WhatsApp
    </a>
  </div>;
}
