# Plano de avaliação do protótipo EcoIA Extension

## 1. Objetivo

Este documento estabelece o procedimento de avaliação funcional do EcoIA Extension (Green AI Monitor), protótipo de extensão para navegadores Chromium desenvolvido no contexto de uma pesquisa sobre os impactos ambientais associados ao uso de ferramentas de Inteligência Artificial (IA) e à navegação web convencional.

A avaliação tem como objetivo verificar o funcionamento das principais funcionalidades implementadas, identificar limitações técnicas e registrar evidências que permitam discutir a confiabilidade dos indicadores apresentados.

A avaliação funcional não representa, por si só, uma validação científica dos fatores energéticos e hídricos utilizados. A validade desses parâmetros deve ser examinada separadamente, com base nas publicações originais e nas condições em que os valores foram obtidos.

## 2. Objetivos específicos

- Verificar a identificação dos serviços de IA contemplados pelo protótipo.
- Verificar o registro das interações realizadas nas páginas monitoradas.
- Conferir os cálculos estimados de energia e água para interações de IA.
- Examinar a coleta de dados de transferência durante a navegação web.
- Verificar o registro do tempo de navegação convencional.
- Examinar se as atualizações dos registros de uma mesma página são consolidadas sem duplicação.
- Verificar a atualização dos indicadores ao selecionar diferentes cenários.
- Registrar limitações, erros e situações em que a coleta não ocorre como esperado.

## 3. Escopo da avaliação

A avaliação contempla as seguintes funcionalidades:

1. Identificação de serviços de IA.
2. Registro de interações.
3. Estimativa energética da IA.
4. Estimativa hídrica da IA.
5. Observação de recursos e dados transferidos na navegação web.
6. Registro do tempo de navegação.
7. Consolidação dos registros de transferência web.
8. Estimativa energética da navegação web.
9. Persistência e apresentação dos dados no popup.
10. Considerações de privacidade relacionadas aos dados armazenados.

A avaliação não pretende medir diretamente o consumo elétrico dos servidores, o consumo hídrico real das infraestruturas ou as emissões efetivas de gases de efeito estufa.

## 4. Ambiente de avaliação

Antes da execução dos testes, devem ser registrados os dados do ambiente utilizado.

| Informação | Registro |
|---|---|
| Sistema operacional | A preencher |
| Navegador e versão | A preencher |
| Versão ou commit da extensão | A preencher |
| Data da avaliação | A preencher |
| Serviços de IA utilizados | A preencher |
| Sites utilizados na navegação web | A preencher |

Os testes devem ser executados com a versão da extensão identificada na tabela. Alterações posteriores no código devem ser registradas para permitir a identificação da versão avaliada.

## 5. Procedimento de avaliação

A avaliação será realizada por meio de testes funcionais com entradas e resultados esperados previamente definidos.

Para cada teste, devem ser registrados:

- O procedimento executado.
- O resultado esperado.
- O resultado observado.
- A evidência obtida.
- A situação final do teste.

As situações possíveis são:

- **Aprovado:** o resultado observado corresponde ao comportamento esperado.
- **Reprovado:** o comportamento observado diverge do esperado.
- **Parcial:** parte do comportamento esperado foi observada, mas houve limitações.
- **Não executado:** o teste ainda não foi realizado.

Um teste só poderá ser classificado após a execução e a análise das evidências correspondentes.

## 6. Casos de teste

### CT01 — Identificação dos serviços de IA

**Objetivo:** verificar se a extensão identifica os serviços contemplados pela implementação.

**Procedimento:**
1. Abrir o ChatGPT.
2. Abrir o Google Gemini.
3. Abrir o Claude.
4. Abrir o Microsoft Copilot.
5. Abrir o Perplexity.
6. Consultar o serviço identificado no popup e, quando necessário, os registros do console.

**Resultado esperado:** cada serviço deve ser identificado conforme as regras de domínio implementadas.

**Evidência:** captura de tela do popup ou registro do console para cada serviço.

**Situação:** A preencher.

### CT02 — Registro de interação com IA

**Objetivo:** verificar se o envio de uma interação produz um registro.

**Procedimento:**
1. Abrir um serviço de IA compatível.
2. Enviar uma mensagem de teste.
3. Consultar a quantidade de interações no popup.
4. Repetir o procedimento em uma nova interação.

**Resultado esperado:** os envios reconhecidos pela implementação devem gerar registros correspondentes.

**Evidência:** quantidade de interações antes e depois do envio, acompanhada de registro do console quando necessário.

**Situação:** A preencher.

**Limitação a observar:** a implementação utiliza mecanismos diferentes conforme o serviço. No ChatGPT, são observados eventos de teclado e de clique; nos demais serviços, a detecção inicial depende de eventos de submissão de formulário. Portanto, o resultado pode variar conforme a interface de cada ferramenta.

### CT03 — Estimativa energética da IA

**Objetivo:** verificar se a energia apresentada corresponde à quantidade de interações e ao fator selecionado.

**Procedimento:**
1. Registrar a quantidade de interações apresentada.
2. Selecionar o cenário baixo.
3. Registrar o valor energético exibido.
4. Repetir para os cenários central e alto.
5. Comparar os valores apresentados com os cálculos manuais.

**Resultado esperado:** a energia calculada deve corresponder à quantidade de interações multiplicada pelo fator do cenário selecionado.

**Fórmula de referência:**

E_IA = N × F_IA

Em que N é a quantidade de interações e F_IA é o fator energético configurado.

**Evidência:** tabela com o cenário, o número de interações, o resultado esperado e o resultado observado.

**Situação:** A preencher.

### CT04 — Estimativa hídrica da IA

**Objetivo:** verificar o cálculo do indicador hídrico apresentado no popup.

**Procedimento:**
1. Registrar a quantidade de interações.
2. Consultar o valor hídrico apresentado.
3. Comparar o valor com o resultado calculado manualmente utilizando o fator configurado.

**Resultado esperado:** o indicador deve corresponder ao número de interações multiplicado pelo fator hídrico de referência.

**Fórmula de referência:**

A_IA = N × F_água

O fator atualmente configurado é de 0,26 mL por interação.

**Evidência:** quantidade de interações, fator utilizado e valor esperado e observado.

**Situação:** A preencher.

### CT05 — Observação de dados transferidos na navegação web

**Objetivo:** verificar se o protótipo registra recursos observados durante a navegação convencional.

**Procedimento:**
1. Abrir uma página web convencional.
2. Navegar e carregar recursos da página.
3. Consultar os dados transferidos observados no popup.
4. Quando necessário, consultar os registros do console e do armazenamento local.

**Resultado esperado:** quando houver entradas de recursos disponibilizadas pelo navegador, a extensão deverá registrar os dados observados e atualizar o resumo correspondente.

**Evidência:** valores exibidos, domínio da página e registros do console.

**Situação:** A preencher.

**Limitação a observar:** a ausência de bytes registrados não comprova ausência de transferência de dados. Recursos em cache e restrições de temporização podem afetar os valores disponibilizados.

### CT06 — Atualização do resumo de transferência

**Objetivo:** verificar se as atualizações sucessivas de uma mesma página são consolidadas.

**Procedimento:**
1. Abrir uma página web.
2. Aguardar o carregamento inicial.
3. Continuar navegando na mesma página para gerar novas entradas de recursos.
4. Consultar os registros armazenados em `webTransfer`.
5. Verificar se as atualizações referentes ao mesmo `pageId` substituem o resumo anterior.

**Resultado esperado:** o resumo da mesma instância de página deve ser atualizado, em vez de cada atualização ser contabilizada como uma nova página.

**Evidência:** registros de `webTransfer`, incluindo `pageId`, bytes e quantidade de recursos.

**Situação:** A preencher.

### CT07 — Registro do tempo de navegação web

**Objetivo:** verificar o registro dos intervalos de atividade de navegação convencional.

**Procedimento:**
1. Abrir uma página web convencional.
2. Mantê-la ativa por um intervalo conhecido.
3. Alternar para outra aba ou retirar o foco do navegador.
4. Consultar o tempo registrado no popup.

**Resultado esperado:** a extensão deverá registrar os intervalos de atividade acompanhados pelo mecanismo de controle de abas.

**Evidência:** duração do intervalo executado e valor exibido no popup.

**Situação:** A preencher.

**Limitação a observar:** o tempo registrado depende dos eventos de abas e janelas e pode não representar perfeitamente o tempo de atenção do usuário.

### CT08 — Estimativa energética da navegação web

**Objetivo:** verificar o cálculo energético baseado nos bytes observados.

**Procedimento:**
1. Registrar a quantidade de bytes observados.
2. Selecionar cada cenário energético.
3. Comparar o valor exibido com o resultado calculado manualmente.

**Resultado esperado:** quando a implementação estiver disponível e executada corretamente, o resultado deverá corresponder à quantidade de bytes convertida para gigabytes decimais e multiplicada pelo fator do cenário.

**Fórmula de referência:**

E_web = (B / 1.000.000.000) × F_web

Em que B representa os bytes observados e F_web representa o fator energético configurado em Wh/GB.

**Evidência:** cenário, bytes observados, fator utilizado e valores esperado e observado.

**Situação:** A preencher.

### CT09 — Persistência e apresentação dos dados

**Objetivo:** verificar se os registros permanecem disponíveis ao fechar e reabrir o popup.

**Procedimento:**
1. Gerar pelo menos um registro de interação ou de navegação.
2. Fechar o popup.
3. Abrir o popup novamente.
4. Comparar os valores apresentados.

**Resultado esperado:** os dados persistidos no armazenamento local devem continuar disponíveis após a reabertura do popup, respeitando a lógica de leitura implementada.

**Evidência:** capturas de tela antes e depois de reabrir o popup.

**Situação:** A preencher.

### CT10 — Privacidade dos dados armazenados

**Objetivo:** identificar quais informações de navegação são persistidas pela extensão.

**Procedimento:**
1. Consultar os registros de `webVisits` e `webTransfer` no armazenamento local.
2. Verificar quais campos são armazenados.
3. Identificar a presença de URLs completas ou de outros dados que possam revelar detalhes da navegação.

**Resultado esperado:** os campos efetivamente armazenados devem ser documentados e avaliados quanto à necessidade de coleta.

**Evidência:** relação dos campos encontrados e avaliação de privacidade.

**Situação:** A preencher.

**Observação:** o código atual de acompanhamento do tempo de navegação armazena a URL da aba. Essa característica deve ser considerada na avaliação e em possíveis melhorias de privacidade.

## 7. Registro consolidado dos resultados

Após a execução dos testes, preencher a tabela abaixo.

| Teste | Resultado | Evidência | Observações |
|---|---|---|---|
| CT01 — Identificação de IA | A preencher | A preencher | A preencher |
| CT02 — Registro de interação | A preencher | A preencher | A preencher |
| CT03 — Energia da IA | A preencher | A preencher | A preencher |
| CT04 — Água da IA | A preencher | A preencher | A preencher |
| CT05 — Dados web | A preencher | A preencher | A preencher |
| CT06 — Resumo por página | A preencher | A preencher | A preencher |
| CT07 — Tempo web | A preencher | A preencher | A preencher |
| CT08 — Energia web | A preencher | A preencher | A preencher |
| CT09 — Persistência | A preencher | A preencher | A preencher |
| CT10 — Privacidade | A preencher | A preencher | A preencher |

## 8. Critérios de interpretação

Os resultados devem ser analisados de acordo com o objetivo de cada teste.

A aprovação de um teste funcional indica que o comportamento observado correspondeu ao esperado naquele ambiente e naquela execução. Isso não garante que o comportamento será idêntico em todos os navegadores, serviços de IA ou páginas web.

Da mesma forma, a correspondência entre um cálculo apresentado e uma fórmula não comprova que o fator de referência representa o consumo real da infraestrutura.

A interpretação deve distinguir:

- **Funcionamento técnico:** capacidade de coletar, armazenar e apresentar dados conforme a implementação.
- **Consistência matemática:** correspondência entre entradas, fórmulas e resultados calculados.
- **Validade dos parâmetros:** adequação dos fatores de referência às fontes e ao contexto analisado.
- **Cobertura da coleta:** proporção e natureza das informações efetivamente observadas pelo navegador.

Essas dimensões são complementares, mas não equivalentes.

## 9. Considerações finais

O plano estabelece uma estrutura reproduzível para a avaliação funcional do EcoIA Extension. A execução dos casos de teste permitirá identificar falhas, registrar evidências e documentar limitações antes da apresentação dos resultados da pesquisa.

Os resultados obtidos devem ser descritos de acordo com as evidências coletadas, sem considerar como validadas funcionalidades que não tenham sido testadas. A avaliação funcional também deve ser acompanhada da conferência bibliográfica dos fatores energéticos e hídricos utilizados pelo protótipo.