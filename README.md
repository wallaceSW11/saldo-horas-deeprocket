# Saldo de Horas

Extensão Chrome para acompanhar a carga horária mensal a partir dos lançamentos exibidos na página de registro de horas.

O objetivo do projeto é responder rapidamente:

- quantas horas já foram trabalhadas no mês;
- quantas horas ainda faltam para cumprir a carga permitida;
- qual média de horas precisa ser feita por dia restante;
- como essa média muda quando um dia tem mais ou menos horas trabalhadas.

Exemplo: se a carga permitida for `70:00` no mês e ainda existirem 22 dias úteis, a extensão calcula a média necessária por dia. Se um dia tiver `08:00` trabalhadas, o saldo restante diminui e a média dos próximos dias cai automaticamente.

## Funcionalidades

- Leitura automática dos totais diários na página do backoffice.
- Carga horária permitida configurável, com padrão de `70:00`.
- Opção para considerar sábado.
- Opção para considerar domingo.
- Exibição de:
  - total já trabalhado;
  - horas restantes;
  - saldo positivo quando passar da carga permitida;
  - média necessária por dia;
  - quantidade de dias restantes.
- O dia atual entra no cálculo de dias restantes quando ainda não existe lançamento para hoje. Se já houver lançamento na data atual, a contagem começa no próximo dia considerado.
- Feriados ainda não são considerados.

## Stack

- Plasmo
- Vue 3
- TypeScript
- Vitest

## Como Usar Localmente

Gere a build de produção:

```bash
pnpm install
pnpm build
```

Depois, no Chrome:

1. Abra `chrome://extensions`.
2. Ative o modo de desenvolvedor.
3. Clique em `Carregar sem compactação`.
4. Selecione a pasta:

```text
C:\dev\extensao\build\chrome-mv3-prod
```

Essa forma não precisa de servidor local, publicação na Chrome Web Store ou pagamento de taxa.

## Desenvolvimento

Para desenvolver com reload do Plasmo:

```bash
pnpm install
pnpm dev
```

Carregue a pasta abaixo no Chrome:

```text
C:\dev\extensao\build\chrome-mv3-dev
```

Enquanto estiver usando a build dev, mantenha `pnpm dev` rodando. Caso contrário, o Chrome pode mostrar erros de WebSocket do HMR do Plasmo.

Para voltar ao uso normal, remova a extensão dev e carregue novamente a pasta `build/chrome-mv3-prod`.

## Estrutura

- `src/popup.vue`: interface da extensão.
- `src/contents/time-sheet-reader.ts`: content script que lê a página atual.
- `src/parsing/pageParser.ts`: parser dos lançamentos exibidos no DOM.
- `src/domain/calculations.ts`: cálculo de saldo, média e dias restantes.
- `src/domain/calendar.ts`: regras de dias considerados.
- `src/domain/time.ts`: parse e formatação de horas.
- `tests/`: testes unitários dos cálculos e parser.

## Scripts

- `pnpm dev`: inicia o Plasmo em modo desenvolvimento.
- `pnpm build`: gera build de produção.
- `pnpm package`: gera pacote zip da extensão.
- `pnpm test`: roda os testes unitários.
- `pnpm typecheck`: valida TypeScript e componentes Vue.

## Observações

- A extensão está configurada para atuar em `https://backoffice.deeprocket.com.br/*`.
- O parser usa o total diário exibido no cabeçalho de cada dia, por exemplo `7h 35min`.
- Se o HTML da página mudar, o ajuste esperado fica concentrado em `src/parsing/pageParser.ts`.
