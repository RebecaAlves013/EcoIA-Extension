# Testes nas interfaces reais das IAs

Além dos testes unitários e dos simuladores locais, o projeto inclui um teste opcional com as interfaces públicas do ChatGPT, Gemini, Claude, Copilot e Perplexity.

## Pré-requisitos

- Node.js e dependências do projeto instaladas (`npm install`).
- Playwright disponível no projeto.
- A extensão carregável a partir da pasta do repositório.
- Acesso às contas das plataformas que serão testadas.

## Executar

No PowerShell do Windows:

```powershell
$env:ECOIA_REAL_TESTS="1"
npm run test:real
```

Em Linux/macOS:

```bash
ECOIA_REAL_TESTS=1 npm run test:real
```

O Chromium abre com a extensão carregada. Na primeira execução, faça login manualmente nas plataformas quando necessário. O perfil fica na pasta local `.playwright-real-profile/`, ignorada pelo Git, para permitir reaproveitar as sessões. Não coloque senhas, cookies ou tokens no código.

## O que o teste verifica

Para cada plataforma, o teste procura um campo de mensagem visível, envia uma única mensagem curta de identificação do teste e aguarda uma nova interação no armazenamento da extensão. Depois confere se o registro identifica o serviço esperado e se apenas um registro foi acrescentado.

Os testes são executados sequencialmente para reduzir interferência entre abas, mensagens e estados de login. A automação percorre as cinco plataformas em uma única execução.

## Limitações importantes

- As interfaces mudam com frequência; seletores podem precisar de atualização.
- Login, avisos de consentimento, limites de uso, CAPTCHA ou verificações de segurança podem impedir o teste automático. Resolva essas etapas manualmente; o teste não tenta contornar proteções.
- O envio de uma mensagem real pode consumir cota da conta e produzir uma resposta. Execute apenas quando estiver de acordo com isso.
- Um teste aprovado demonstra que a interação foi detectada nessa execução, não que todos os formatos de envio serão detectados em todas as versões da interface.
- Os testes reais são opt-in e ficam separados dos testes locais para não abrir sites externos durante a suíte normal.

## Execução recomendada

1. Execute `npm run test:all` para validar cálculos, armazenamento, popup e simuladores locais.
2. Execute os testes reais com a variável `ECOIA_REAL_TESTS=1`.
3. Se uma plataforma falhar, registre o serviço e a mensagem de erro; verifique se houve login, alteração no campo de mensagem ou mudança no botão de envio antes de alterar o detector.
