# Arquitetura e metodologia — EcoIA Extension

## 1. Apresentação

O EcoIA Extension, também denominado Green AI Monitor, é um protótipo de extensão para navegadores baseados em Chromium. Seu propósito é investigar formas de apresentar indicadores experimentais relacionados ao impacto ambiental do uso de ferramentas de Inteligência Artificial (IA) e da navegação web convencional.

O sistema utiliza eventos das páginas, recursos disponibilizados pelas APIs do navegador e parâmetros de referência configurados em um arquivo JSON para produzir estimativas de consumo energético e hídrico.

O protótipo não realiza medições físicas de energia ou água. Seus resultados são estimativas condicionadas pelos dados coletados, pelos fatores de referência adotados e pelas limitações de implementação.

## 2. Arquitetura do sistema

A extensão utiliza a arquitetura de extensões do Chrome baseada no Manifest V3. Seus componentes estão organizados por responsabilidade.

### 2.1. Arquivo de configuração

O arquivo `manifest.json` define as configurações da extensão, as permissões utilizadas, o script de segundo plano, o popup e os scripts executados nas páginas monitoradas.

O projeto utiliza permissões para armazenamento local e consulta de abas, além de configurar a execução do script de conteúdo nas páginas abrangidas pelo manifesto.

### 2.2. Script de conteúdo

Arquivo: `src/content/content.js`

O script de conteúdo é responsável por identificar se a página pertence a um dos serviços de IA contemplados pela implementação ou se será tratada como navegação web convencional.

Nos serviços de IA reconhecidos, o script registra eventos considerados indicativos de envio de uma interação. Na navegação web, utiliza a API `PerformanceObserver` para observar recursos carregados e consultar seus tamanhos de transferência.

Os dados coletados são enviados ao script de segundo plano para armazenamento.

### 2.3. Script de segundo plano

Arquivo: `src/background/background.js`

O script de segundo plano recebe mensagens dos scripts de conteúdo e administra os registros armazenados pela extensão.

Suas responsabilidades incluem:

- Receber registros de interações com IA.
- Armazenar os registros de transferência web.
- Acompanhar a atividade de abas para estimar o tempo de navegação convencional.
- Manter os registros em `chrome.storage.local`.

Os registros de transferência web utilizam um identificador de página (`pageId`) para atualizar o resumo da mesma instância de página, em vez de adicionar cada atualização como se fosse uma nova página.

### 2.4. Módulo de cálculos

Arquivo: `src/calculations/energy.js`

Esse módulo disponibiliza funções para calcular a energia estimada a partir da quantidade de interações e de um fator energético, além de formatar os resultados.

### 2.5. Serviço de parâmetros

Arquivo: `src/services/parameters.js`

Esse componente carrega os parâmetros definidos em `data/parameters.json`, separando os valores utilizados nos cálculos do código responsável pela interface.

Essa organização facilita a alteração de fatores de referência sem a necessidade de modificar diretamente as fórmulas.

### 2.6. Interface

Arquivos:

- `src/popup/popup.html`
- `src/popup/popup.css`
- `src/popup/popup.js`

O popup apresenta o serviço identificado na aba atual, a quantidade de interações registradas, o cenário selecionado, as estimativas de energia e água, o tempo de navegação web e os dados de transferência observados.

A interface consulta os registros locais e aplica os cálculos correspondentes aos indicadores implementados.

## 3. Fluxo de dados

O funcionamento geral pode ser representado pelas seguintes etapas:

1. O navegador carrega a extensão e executa o script de conteúdo nas páginas abrangidas pelo manifesto.
2. O script identifica o tipo de página e, quando aplicável, o serviço de IA.
3. Eventos de interação ou informações de recursos web são coletados conforme as regras implementadas.
4. O script de conteúdo envia mensagens ao script de segundo plano.
5. O script de segundo plano registra as informações no armazenamento local.
6. O popup recupera os dados e carrega os parâmetros de referência.
7. As funções de cálculo produzem estimativas, que são apresentadas na interface.

Esse fluxo descreve a arquitetura pretendida e implementada no código; a execução integral de cada etapa ainda depende de validação funcional.

## 4. Metodologia dos indicadores

### 4.1. Estimativa energética das interações com IA

A estimativa utiliza a quantidade de interações registradas e o fator energético associado ao cenário selecionado.

E_IA = N × F_IA

Em que:

- E_IA representa a energia estimada, em Wh.
- N representa o número de interações registradas.
- F_IA representa o fator energético de referência, em Wh por interação.

O arquivo de parâmetros contempla os seguintes cenários:

| Cenário | Fator configurado |
|---|---:|
| Baixo | 0,16 Wh/interação |
| Central | 0,31 Wh/interação |
| Alto | 0,60 Wh/interação |

Esses fatores são valores configurados no protótipo. Sua utilização como referência para diferentes serviços de IA exige verificar a publicação de origem, as condições experimentais e a compatibilidade entre o contexto estudado e o uso pretendido.

### 4.2. Estimativa hídrica das interações com IA

A estimativa hídrica é calculada utilizando o número de interações registradas e um fator de referência:

A_IA = N × F_água

Em que:

- A_IA representa a água estimada, em mL.
- N representa o número de interações registradas.
- F_água representa o fator hídrico, em mL por interação.

O arquivo de parâmetros utiliza o valor de referência de 0,26 mL por interação.

Esse fator não deve ser interpretado como uma quantidade universal de água consumida por qualquer consulta. A interpretação depende do sistema estudado e das fronteiras de contabilização adotadas pela fonte.

### 4.3. Observação de dados na navegação web

Durante a navegação convencional, o protótipo utiliza a API `PerformanceObserver` para observar entradas de recursos e consultar a propriedade `transferSize`.

Os dados registrados incluem o total de bytes observados, a quantidade de recursos identificados e a quantidade de recursos cujo tamanho de transferência foi igual a zero.

A coleta é parcial: nem todo o tráfego de rede necessariamente aparece nesses registros, e determinadas condições de cache e temporização podem afetar os valores disponibilizados pelo navegador.

Consequentemente, o total observado não deve ser descrito como uma medição completa do tráfego de rede.

### 4.4. Estimativa energética da navegação web

O arquivo `data/parameters.json` contém fatores de referência expressos em Wh/GB.

A estimativa é definida por:

E_web = (B / 1.000.000.000) × F_web

Em que:

- E_web representa a energia estimada, em Wh.
- B representa a quantidade de bytes observados.
- F_web representa o fator energético de referência, em Wh/GB.

Os fatores configurados são:

| Cenário | Fator configurado |
|---|---:|
| Baixo | 1,1 Wh/GB |
| Central | 1,8 Wh/GB |
| Alto | 2,4 Wh/GB |

A conversão considera o gigabyte decimal, equivalente a 1.000.000.000 bytes.

A estimativa depende tanto da cobertura dos dados observados quanto da adequação do fator energético à infraestrutura e ao contexto analisados. Os valores configurados não devem ser considerados universais ou estatisticamente representativos sem verificação bibliográfica.

### 4.5. Tempo de navegação

O script de segundo plano registra intervalos de atividade de abas classificadas como navegação web convencional. O tempo é calculado a partir da diferença entre o início e o encerramento do intervalo registrado.

Esse indicador descreve o tempo acompanhado pelo mecanismo da extensão. Não representa, por si só, consumo energético, e sua precisão depende do comportamento dos eventos de abas e janelas.

## 5. Parâmetros e referências

Os metadados atualmente registrados em `data/parameters.json` associam os parâmetros às seguintes referências:

- Oviedo et al. (2026), *Energy use of AI inference: efficiency pathways and test-time scaling*. DOI informado: 10.1016/j.joule.2026.102430.
- Elsworth et al. (2025), *Measuring the environmental impact of delivering AI at Google Scale*. DOI informado: 10.48550/arXiv.2508.15734.
- Guennebaud e Bugeau (2024), *Energy consumption of data transfer: intensity indicators versus absolute estimates*. DOI informado: 10.1111/jiec.13513.

Os títulos, autores, valores e contextos precisam ser conferidos nas publicações originais antes da versão final do trabalho acadêmico. O registro de uma referência no arquivo de configuração não constitui, isoladamente, validação do fator numérico utilizado.

## 6. Limitações metodológicas e técnicas

As principais limitações conhecidas são:

1. **Detecção de interações:** a identificação depende dos eventos e elementos presentes nas páginas dos serviços de IA. Mudanças nas interfaces podem afetar a coleta.
2. **Cobertura dos dados web:** o `PerformanceObserver` não garante a observação de todo o tráfego de rede.
3. **Recursos sem tamanho disponível:** registros com `transferSize` igual a zero não significam necessariamente que nenhum dado foi transferido.
4. **Fatores de referência:** os resultados dependem da validade e da aplicabilidade dos fatores energéticos e hídricos.
5. **Ausência de medição física:** o protótipo não mede diretamente o consumo elétrico de dispositivos, centros de dados ou redes, nem o consumo hídrico efetivo.
6. **Emissões de carbono:** não há, nesta versão documentada, cálculo implementado de CO₂ equivalente.
7. **Água na navegação web:** não há fator hídrico configurado para estimar a água associada à transferência web.
8. **Validação:** os resultados ainda precisam de testes funcionais, análise de consistência e avaliação da adequação dos parâmetros.

Os indicadores devem ser apresentados como estimativas experimentais, e não como medições diretas ou valores universais.

## 7. Privacidade e armazenamento

A extensão utiliza `chrome.storage.local` para manter os registros no navegador.

O código atual de acompanhamento de tempo de navegação armazena a URL da aba em registros de atividade web. Portanto, a implementação ainda pode persistir endereços completos de páginas nesse mecanismo, mesmo que o resumo de transferência utilize o domínio.

Essa característica deve ser considerada na avaliação de privacidade. Uma evolução futura pode substituir o armazenamento de URLs completas por domínios, limitar a retenção dos registros e oferecer ao usuário uma opção para apagar os dados coletados.

## 8. Próximas etapas de desenvolvimento

Como evolução do protótipo, recomenda-se:

- Realizar testes funcionais de detecção e registro das interações.
- Verificar a atualização e a consistência dos registros de transferência web.
- Validar a implementação dos cálculos com exemplos controlados.
- Conferir os parâmetros nas publicações originais.
- Avaliar a compatibilidade dos fatores de referência com os cenários comparados.
- Melhorar a transparência sobre a incerteza das estimativas.
- Revisar o armazenamento de dados para reduzir a persistência de informações de navegação.
- Avaliar a viabilidade de indicadores adicionais somente quando houver metodologia e parâmetros adequados.

## 9. Considerações finais

O EcoIA Extension constitui um protótipo para explorar a apresentação de indicadores ambientais relacionados ao uso de IA e à navegação web. Sua contribuição está na organização de registros e parâmetros em uma ferramenta acessível ao usuário, permitindo discutir estimativas e limitações de sustentabilidade digital.

A confiabilidade dos resultados depende de validação técnica, consistência dos dados coletados e fundamentação bibliográfica dos fatores utilizados. Esses aspectos devem ser explicitados na apresentação do protótipo e na discussão dos resultados do TCC.