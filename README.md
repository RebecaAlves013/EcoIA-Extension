# EcoIA Extension — Green AI Monitor

Extensão para navegadores baseados em Chromium que registra interações com ferramentas de Inteligência Artificial (IA), acompanha aspectos da navegação web convencional e apresenta estimativas experimentais de consumo de recursos.

O projeto está sendo desenvolvido como parte de uma pesquisa acadêmica sobre os impactos ambientais associados à utilização de ferramentas de IA e à infraestrutura necessária para seu funcionamento.

## Objetivo

Investigar como uma extensão de navegador pode contribuir para a compreensão dos impactos ambientais associados ao uso de ferramentas de IA, oferecendo indicadores estimados e informações sobre a atividade de navegação convencional.

O protótipo busca:

- Registrar interações com serviços de IA compatíveis.
- Estimar o consumo energético associado às interações registradas.
- Calcular uma estimativa de consumo de água por interação de IA com base em um parâmetro de referência.
- Observar dados transferidos durante a navegação web convencional.
- Estimar a energia associada aos dados transferidos observados.
- Permitir a comparação entre cenários de estimativa baixo, central e alto.

## Funcionalidades implementadas

### 1. Registro de interações com IA

A extensão identifica os seguintes serviços:

- ChatGPT
- Google Gemini
- Claude
- Microsoft Copilot
- Perplexity

As interações são registradas por meio de eventos da página. No ChatGPT, são monitorados eventos de envio pelo teclado e pelo botão de envio. Para os demais serviços, a implementação utiliza inicialmente a submissão de formulários.

A detecção depende da estrutura das páginas e pode não registrar todas as interações corretamente.

### 2. Estimativa de consumo energético da IA

O sistema multiplica a quantidade de interações registradas pelo fator energético selecionado.

A extensão oferece três cenários:

- **Baixo:** 0,16 Wh por interação.
- **Central:** 0,31 Wh por interação.
- **Alto:** 0,60 Wh por interação.

Os valores estão registrados em `data/parameters.json` e são atribuídos à referência bibliográfica cadastrada nesse arquivo.

Esses fatores são parâmetros de referência para estimativas, não medições individuais do consumo de cada consulta. O resultado depende da aplicabilidade dos valores à ferramenta, ao modelo e às condições de utilização analisadas.

### 3. Estimativa de consumo de água da IA

A extensão calcula uma estimativa utilizando o parâmetro de referência de 0,26 mL por interação.

O cálculo é realizado multiplicando o número de interações registradas pelo fator hídrico configurado.

Esse indicador não representa uma medição direta do consumo de água de cada consulta. Sua interpretação depende do contexto e do método do estudo utilizado como referência.

### 4. Monitoramento de dados da navegação web

Durante a navegação convencional, a extensão utiliza a API `PerformanceObserver` para observar recursos carregados pela página e seus tamanhos de transferência disponibilizados pelo navegador.

Os dados registrados incluem:

- Quantidade de bytes observados.
- Quantidade de recursos identificados.
- Quantidade de recursos com tamanho de transferência igual a zero.
- Tempo de navegação web registrado pelo mecanismo de acompanhamento de abas.

Os dados observados podem ser incompletos, pois o navegador pode não disponibilizar o tamanho de transferência de todos os recursos. O indicador não equivale necessariamente ao tráfego total de rede.

### 5. Estimativa energética da navegação web

A extensão utiliza fatores energéticos configurados em `data/parameters.json`, expressos em Wh/GB, para estimar a energia associada aos dados transferidos observados.

A estimativa utiliza o cenário selecionado e converte os bytes registrados para gigabytes decimais.

O resultado é experimental: depende tanto da cobertura da coleta de dados quanto da adequação do fator energético utilizado. Não representa o consumo elétrico total do dispositivo, do navegador ou da infraestrutura da internet.

## Cenários de estimativa

| Cenário | Energia da IA | Energia da web |
|---|---:|---:|
| Baixo | 0,16 Wh/interação | 1,1 Wh/GB |
| Central | 0,31 Wh/interação | 1,8 Wh/GB |
| Alto | 0,60 Wh/interação | 2,4 Wh/GB |

Os fatores estão definidos no arquivo de parâmetros do projeto. Os cenários servem para explorar a variação dos resultados; não devem ser interpretados automaticamente como intervalos estatísticos universais.

## Tecnologias utilizadas

- JavaScript
- HTML5
- CSS3
- Chrome Extensions API
- Manifest V3
- `chrome.storage.local`
- `chrome.tabs`
- `PerformanceObserver`
- JSON para configuração dos parâmetros

## Estrutura do projeto

```text
EcoIA-Extension/
├── data/
│   └── parameters.json
├── src/
│   ├── background/
│   │   └── background.js
│   ├── calculations/
│   │   └── energy.js
│   ├── content/
│   │   └── content.js
│   ├── popup/
│   │   ├── popup.css
│   │   ├── popup.html
│   │   └── popup.js
│   └── services/
│       └── parameters.js
├── tests/
│   ├── fixtures/
│   │   └── chatgpt.html
│   ├── ecoia.test.js
│   └── e2e.test.js
├── manifest.json
├── package.json
└── README.md
```

## Instalação para desenvolvimento

1. Baixe ou clone este repositório.
2. Abra o Google Chrome ou outro navegador compatível com extensões Chromium.
3. Acesse `chrome://extensions`.
4. Ative o **Modo do desenvolvedor**.
5. Clique em **Carregar sem compactação**.
6. Selecione a pasta do projeto que contém o arquivo `manifest.json`.
7. Abra uma página compatível e utilize o ícone da extensão para consultar os indicadores.

Após alterações nos arquivos, recarregue a extensão pela página de gerenciamento. Dependendo da alteração, pode ser necessário atualizar também a página monitorada.

## Metodologia de cálculo

### Energia estimada da IA

\[
E_{IA}=N_{interações}\times F_{energia}
\]

Em que:

- \(E_{IA}\) é a energia estimada, em Wh.
- \(N_{interações}\) é a quantidade de interações registradas.
- \(F_{energia}\) é o fator energético selecionado, em Wh por interação.

### Água estimada da IA

\[
A_{IA}=N_{interações}\times F_{água}
\]

Em que:

- \(A_{IA}\) é a água estimada, em mL.
- \(F_{água}\) é o fator hídrico de referência, em mL por interação.

### Energia estimada da navegação web

\[
E_{web}=\frac{B_{observados}}{10^9}\times F_{web}
\]

Em que:

- \(E_{web}\) é a energia estimada, em Wh.
- \(B_{observados}\) é a soma dos bytes observados.
- \(F_{web}\) é o fator energético selecionado, em Wh/GB.

Essas fórmulas representam estimativas baseadas em parâmetros externos. A extensão não mede diretamente a energia elétrica ou o consumo hídrico das infraestruturas envolvidas.

## Limitações conhecidas

- A detecção de interações depende dos eventos e elementos presentes nas páginas dos serviços.
- A observação de recursos web não garante a contabilização de todo o tráfego de rede.
- Recursos em cache ou sujeitos a restrições de temporização podem apresentar tamanhos indisponíveis ou iguais a zero.
- Os fatores energéticos e hídricos dependem do contexto dos estudos de referência.
- A estimativa hídrica está implementada para interações de IA; não há fator hídrico configurado para a navegação web.
- A extensão não realiza medição física de energia, emissões de carbono ou consumo de água.
- Os resultados devem ser interpretados como indicadores experimentais e não como valores universais.
- A compatibilidade com alterações futuras nas interfaces dos serviços de IA precisa ser acompanhada.

## Referências dos parâmetros

As referências abaixo correspondem aos metadados atualmente registrados em `data/parameters.json`. Sua pertinência, os valores numéricos e as condições de aplicação devem ser conferidos na publicação original antes de serem tratados como parâmetros definitivos da pesquisa.

- OVIEDO et al. (2026). *Energy use of AI inference: efficiency pathways and test-time scaling*. DOI: [10.1016/j.joule.2026.102430](https://doi.org/10.1016/j.joule.2026.102430).
- ELSWORTH et al. (2025). *Measuring the environmental impact of delivering AI at Google Scale*. DOI: [10.48550/arXiv.2508.15734](https://doi.org/10.48550/arXiv.2508.15734).
- GUENNEBAUD; BUGEAU (2024). *Energy consumption of data transfer: intensity indicators versus absolute estimates*. DOI: [10.1111/jiec.13513](https://doi.org/10.1111/jiec.13513).

## Estado do projeto

O EcoIA-Extension é um protótipo de extensão para navegadores baseados em Chromium, desenvolvido para registrar interações com ferramentas de Inteligência Artificial, observar dados de transferência durante a navegação web e apresentar estimativas experimentais de consumo de energia e água.

O projeto conta com testes automatizados unitários e de ponta a ponta (E2E), executados por meio dos comandos disponíveis no `package.json`. Na execução registrada durante o desenvolvimento, **14 testes foram aprovados, sem falhas ou testes ignorados**.

Os testes verificam funcionalidades como o registro de interações, a prevenção de registros duplicados nos cenários contemplados, os cálculos estimados, a persistência dos dados, a apresentação dos indicadores e o funcionamento do modo de simulação.

A aprovação dos testes demonstra o comportamento esperado nos cenários automatizados, mas não comprova a medição real do consumo energético ou hídrico das infraestruturas utilizadas. A compatibilidade com mudanças nas interfaces dos serviços, a cobertura da coleta de dados e a validade dos parâmetros bibliográficos continuam sendo aspectos importantes para avaliação.

O projeto permanece sujeito a melhorias, validação das referências utilizadas e testes complementares em condições de uso real.

### Executar os testes

É necessário ter o Node.js e o npm instalados. Na pasta do projeto, execute:

```bash
npm install
npm run test:all
```

O comando `npm run test:all` executa os testes unitários e os testes de ponta a ponta configurados no projeto. Os testes E2E utilizam Playwright e Chromium; a execução pode depender da disponibilidade e da configuração do navegador no ambiente de teste.

## Licença

A licença de distribuição ainda deve ser definida pelo responsável pelo projeto.
