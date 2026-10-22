import type { Prospect, Interaction } from "../models";
export const OBJECTIONS: Record<string, string> = {
  "Já tenho fornecedor.":
    "Entendo e respeito essa parceria. Podemos conhecer suas necessidades e avaliar uma alternativa complementar, sem compromisso?",
  "Não tenho interesse.":
    "Obrigado pela sinceridade. Há alguma necessidade específica que poderíamos atender no futuro? Posso retornar apenas quando fizer sentido para você.",
  "Está caro.":
    "Qual referência está usando na comparação? Vamos entender o volume e os critérios mais importantes antes de avaliar uma proposta, sem prometer condições.",
  "Não conheço a marca.":
    "É natural. Posso apresentar as informações disponíveis sobre a marca e esclarecer suas dúvidas antes de qualquer decisão.",
  "Agora não é um bom momento.":
    "Sem problema. Qual seria um dia e horário mais conveniente para conversarmos? Respeitaremos seu tempo.",
};
export const NEXT_ACTION = {
  new: "Registre uma primeira abordagem para identificar o responsável pelas compras.",
  contacted: "Descubra o perfil de consumo e confirme se existe interesse.",
  qualified: "Entenda o volume potencial e apresente uma proposta adequada.",
  negotiation: "Agende um retorno e registre as principais objeções.",
  pending: "Confira as informações necessárias antes da ativação.",
  active: "Planeje a primeira compra e acompanhe o resultado.",
  purchased:
    "Acompanhe a experiência da primeira compra e combine o próximo contato.",
};
export function insights(p: Prospect, history: Interaction[]) {
  const focus: Record<string, string> = {
    Padaria: "demanda diária, variedade e frequência de reposição",
    Mercado: "categorias mais procuradas, mix e compras recorrentes",
    Açougue: "perfil de consumo e regularidade de abastecimento",
    Restaurante: "volume de utilização e consistência do fornecimento",
    Mercearia: "mix essencial e reposição recorrente",
    Lanchonete: "itens de maior saída e frequência de abastecimento",
    Conveniência: "disponibilidade do mix e horários de maior procura",
  };
  const last = history
    .filter((i) => i.type !== "Sistema")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const objection = history
    .filter((i) => i.objection)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.objection;
  return {
    opening: `Olá${p.contactName ? `, ${p.contactName}` : ""}! Gostaria de conhecer melhor ${p.businessName} e entender como podemos contribuir com ${p.mainInterest || focus[p.businessType]}.`,
    questions: [
      `Como vocês organizam ${focus[p.businessType]}?`,
      `Qual o maior desafio${p.commercialNeed ? ` em ${p.commercialNeed.toLowerCase()}` : " no abastecimento atualmente"}?`,
      p.purchaseFrequency
        ? `A frequência ${p.purchaseFrequency.toLowerCase()} atende à demanda do estabelecimento?`
        : "Qual frequência de compra faz sentido para vocês?",
    ],
    argument: `Para um estabelecimento de porte ${p.businessSize}, vale explorar ${focus[p.businessType]}.${p.commercialNeed ? ` Foque na necessidade registrada: ${p.commercialNeed}.` : ""} Confirme as condições disponíveis antes de propor qualquer oferta.`,
    next: NEXT_ACTION[p.stage],
    context: last
      ? `Último resultado: ${last.outcome || last.description}`
      : "Ainda não há contato registrado. Comece ouvindo o responsável.",
    objection,
    response: objection
      ? OBJECTIONS[objection] ||
        "Ouça a preocupação, confirme o que é importante e combine um próximo passo respeitoso."
      : null,
  };
}
