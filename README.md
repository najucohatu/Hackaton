# Rota+

**Mais oportunidades. Mais clientes. Mais resultados.**

Assistente de prospecção para vendedores de rota, desenvolvido como MVP de um Hackathon de Varejo. Organiza estabelecimentos, contatos e visitas até a ativação e a primeira compra, com recomendações comerciais e XP conectados às ações reais do aplicativo.

## Executar

Requisitos: Node.js 22.12+ (validado com Node 24) e npm.

```bash
cd /workspace/Hackaton
npm install
npm run dev
```

Abra o endereço indicado pelo Vite no navegador. Para instalação reproduzível, use `npm ci` com o lockfile. Não são necessárias chaves, serviços de backend, banco de dados ou autenticação. Fontes, ícones e recursos visuais são locais.

```bash
npm run build         # TypeScript e bundle de produção
npm run preview       # servir o build
npm test              # 27 testes das regras e persistência
npm run lint          # ESLint e regras de hooks
npm run test:e2e      # testes reais em Chromium
npm run format:check  # formatação
```

Os testes de navegador iniciam o Vite se necessário. No ambiente da nuvem usam `/usr/bin/chromium`. Em outra máquina, instale `npx playwright install chromium` e ajuste `PLAYWRIGHT_CHROMIUM_PATH` ou deixe o Playwright usar seu navegador instalado (veja `playwright.config.ts`).

## O que funciona

- **Visão geral:** seis indicadores derivados da base, prioridades, retornos atrasados, funil, atividades e visitas de hoje.
- **Potenciais clientes:** cadastro rápido e edição completa, busca sem acentos, filtros combinados, ordenação, cards/lista, detecção de possíveis duplicados por nome/localização ou telefone e exclusão confirmada.
- **Perfil:** dados comerciais, contatos, linha do tempo, agendamento de retorno, visitas, cadastro comercial, compras e recomendações integrados.
- **Oportunidades:** sete estágios estáveis, Kanban no desktop e lista no celular. Mudanças explícitas ficam no histórico; etapas finais exigem registros válidos.
- **Minha rota:** agenda, filtros, visitas de hoje/futuras/atrasadas/concluídas, edição, cancelamento confirmado e conclusão com resultado, objeção e próximo contato.
- **Rota+ Insights:** recomendações personalizadas por regras de tipo, porte, interesse, necessidade, frequência, estágio, objeção e histórico; respostas a cinco objeções e cópia para a área de transferência.
- **Desempenho:** indicadores, volume de primeiras compras, cinco níveis, conquistas automáticas, matriz e histórico de XP.
- **Configurações:** nome do vendedor, exportação JSON, importação validada com confirmação e restauração da demonstração.

Todos os fluxos usam o mesmo repositório local. Não há botões que simulem resultados alterando apenas a interface.

## Dados e persistência

Na primeira abertura, são gerados **15 estabelecimentos fictícios**, com contatos, visitas, pedidos e recompensas coerentes. A agenda é relativa à data da geração. Ela não é recalculada a cada recarga; restaure a demonstração para renovar as datas.

A base usa `localStorage`, chave `rota-plus:v1`, e schema versionado (`schemaVersion: 1`). Não há uma versão antiga a migrar: versões desconhecidas são rejeitadas em vez de interpretar dados incompatíveis. Toda gravação comercial é feita como uma transação em uma cópia, validada e persistida antes de atualizar a interface. Falhas de quota/bloqueio são informadas, sem afirmar que houve salvamento.

Dados corrompidos carregam uma demonstração utilizável, com aviso; uma cópia bruta de recuperação é preservada em `rota-plus:v1:recovery:<timestamp>` quando o navegador permite. A sincronização por evento de storage acompanha alterações em outras abas; não há coordenação distribuída para edições simultâneas conflitantes.

Backups são validados por schema, IDs, relações entre registros, requisitos de ativação, visitas concluídas e recompensas. JSON inválido, versões desconhecidas, referências órfãs, XP incompatível e eventos duplicados são rejeitados. Importação e restauração substituem a base apenas após confirmação. Faça uma exportação antes.

Excluir um estabelecimento remove também seus registros dependentes e recompensas, recalculando indicadores e conquistas. Retroceder um estágio preserva ativação, pedidos e recompensas já conquistadas.

## Regras comerciais e XP

| Ação                           | XP  | Condição                                                             |
| ------------------------------ | --- | -------------------------------------------------------------------- |
| Novo potencial válido          | 1   | Uma vez por estabelecimento                                          |
| Visita concluída               | 2   | Resultado e observação válidos; uma vez por visita                   |
| Avanço explícito de negociação | 3   | Uma vez por estágio intermediário e cliente                          |
| Ativação comercial             | 4   | Nome, tipo, contato, endereço/cidade/UF e confirmação do responsável |
| Primeira compra                | 5   | Cliente ativado, data válida, valor positivo e referência única      |

O primeiro contato muda automaticamente um potencial novo para `Primeiro contato realizado`, sem XP extra. Assim, concluir uma visita gera apenas seus 2 XP. Contatos avulsos não recebem XP próprio. Agendar, editar, abrir telas, recarregar e retroceder etapas não dão pontos. Ativação e compra têm recompensas próprias, sem o adicional de avanço de estágio.

O histórico de recompensas usa chaves estáveis `ação:cliente:entidade`. Repetir a mesma operação não repete a recompensa. Uma segunda compra pode ser registrada, mas não repete XP nem conta como outra primeira compra.

Níveis configuráveis em `src/models/index.ts`: Explorador Comercial (0), Prospectador (30), Negociador (80), Conquistador (160) e Mestre das Rotas (300). As cinco conquistas são calculadas a partir das ações salvas, com data da recompensa correspondente.

**Conversão:** clientes que já foram ativados / total de estabelecimentos × 100. Clientes com compra continuam sendo contados uma única vez entre os ativados. Volume de primeiras compras soma o primeiro pedido por estabelecimento, ordenado por data.

## Arquitetura e integração futura

```text
src/
  models/       # schemas Zod, tipos, estágios, tabela de XP e níveis
  data/         # fábrica da demonstração e valores iniciais
  services/     # regras comerciais, persistência, métricas, insights e formatos
  components/   # dashboard, listas, perfil, formulários, desempenho e UI
  styles/       # layout desktop/mobile e acessibilidade
  App.tsx       # navegação por hash e transações da aplicação
  main.tsx
 tests/
  business.test.ts
  e2e/app.spec.ts
```

O repositório estava vazio: **não havia sistema anterior de gamificação para integrar**. O módulo local está implementado e a interface `GamificationAdapter`, em `src/services/business.ts`, estabelece um ponto de integração futura. Um sistema anterior pode consumir os eventos estáveis de recompensa por um adaptador, com deduplicação por `eventKey`. O contrato ainda não está conectado a nenhum serviço externo. Integrações com backend devem tratar autenticação, sincronização e idempotência no servidor.

## Roteiro de apresentação (3 a 5 minutos)

1. **30 s — contexto:** mostre o dashboard e explique a dificuldade de lembrar contatos e priorizar a rota.
2. **45 s — novo potencial:** cadastre “Padaria Nova Jornada”, selecione Padaria e informe e-mail fictício, endereço, cidade e UF. Receba **+1 XP** e consulte os Insights.
3. **60 s — visita:** agende uma visita no perfil, abra “Registrar resultado” e conclua com resultado Produtiva e uma descrição. Receba **+2 XP** e confira o histórico.
4. **30 s — negociação:** use “Atualizar negociação” para avançar a Em negociação. Receba **+3 XP**. Agende um retorno com próxima ação.
5. **30 s — conversão:** clique em “Concluir cadastro”, confira os requisitos e confirme a verificação comercial. Ative o cliente e receba **+4 XP**.
6. **45 s — primeira compra:** registre um pedido fictício de R$ 700,00 com data atual. Receba **+5 XP**. Mostre o dashboard e o desempenho atualizados: **15 XP** no fluxo e um novo cliente com primeira compra.
7. **15 s — fechamento:** recarregue para mostrar persistência e explique que backups podem ser exportados em Configurações.

## Validação executada

- 27 testes de domínio/persistência: obrigatórios, edição, duplicação, contatos, transições, idempotência, ativação, pedidos, visitas, métricas, níveis, conquistas, backups, corrupção e insights.
- 8 testes E2E em Chromium: jornada completa com 15 XP, recarga, edição, busca, exclusão, importação/exportação/restauração, contato, filtros, edição/cancelamento de visita e recuperação de dados corrompidos.
- Verificação de todas as áreas e perfil, sem transbordamento horizontal da página, em **375, 430, 768 e 1366 px**; criação de cliente pelo formulário em cada tamanho.
- Eventos `pageerror` e erros de console monitorados durante a jornada e os testes responsivos.
- Build TypeScript/Vite e lint executados.

Os testes são reproduzíveis pelos comandos acima; nenhum ERP/CRM externo foi testado ou integrado.

## Limitações reais

- É uma demonstração local de usuário único, sem autenticação, servidor, colaboração em tempo real ou segurança de produção. Não insira informações sensíveis.
- Clientes, pessoas, endereços e pedidos de exemplo são fictícios; e-mails usam domínio `.invalid`. Telefones demonstrativos ficam vazios para evitar contatos acidentais.
- Ativação e compra são registros simulados, sem pagamento, estoque ou faturamento.
- Insights usam regras locais, sem IA generativa ou promessas de preço/margem/condições.
- Google Maps e WhatsApp são links externos opcionais; não há geolocalização, mapa incorporado nem otimização automática de trajeto. O endereço de exemplo é ilustrativo.
- O aplicativo executa sem APIs externas enquanto o servidor local estiver disponível. Não é um PWA instalável com cache de navegação offline.
- Persistência é específica deste navegador e origem; apagar dados do navegador remove a base. Backups não têm assinatura criptográfica e não devem ser tratados como dados autenticados.
- A cópia de sugestões exige suporte à Clipboard API (normalmente HTTPS ou ambiente local); o app informa quando não pode copiar.
