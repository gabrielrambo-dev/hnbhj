# Nemotron Desktop

App desktop em PT-BR inspirado em assistentes modernos de IA e coding agents, com identidade própria: tema preto/roxo, projetos, arquivos, artifacts, terminal, fontes, área de estudo e integração com modelos via NVIDIA API.

> Observação: o Nemotron não copia marca, layout ou elementos proprietários do Claude. Ele recria funções equivalentes em uma interface própria.

## O que foi adicionado nesta versão

- Área separada **Estudos**.
- Botões de estudo:
  - Plano rápido.
  - Resumo essencial.
  - Quiz.
  - Mini simulado.
- Modo de resposta:
  - Padrão.
  - Rápido.
  - Profundo.
  - Código.
  - Estudo.
- Controle melhorado de tokens:
  - Max tokens de resposta.
  - Janela de contexto.
  - Reserva de saída.
  - Estimativa de tokens por mensagem.
  - Estimativa de tokens do chat.
  - Corte automático de mensagens antigas quando passar do limite seguro.
- Sistema de fontes:
  - Arquivos anexados viram fonte automaticamente.
  - Imagens anexadas aparecem como fonte visual.
  - Links colados no chat são buscados pelo Electron e viram fonte textual quando possível.
  - Respostas são instruídas a citar no formato `[Fonte N: nome]`.
  - O app avisa a IA para não inventar fontes.
- Prompt interno melhorado para respostas mais diretas.
- Correção do `tsconfig` para TypeScript mais novo.
- Arquivo `vite-env.d.ts` para build com Vite/React.

## Funções principais

- Chat com IA via NVIDIA API.
- Streaming de resposta.
- Botão para cancelar geração.
- Histórico de chats salvo localmente.
- Projetos com seleção de pasta local.
- Leitura da árvore de arquivos.
- Abrir, editar, criar, salvar e excluir arquivos.
- Backup automático antes de sobrescrever/excluir arquivos.
- Painel de Artifacts para códigos, documentos e HTML com preview.
- Upload de arquivos de texto/código.
- Upload de imagens/prints para modelos NVIDIA com visão, caso sua conta/modelo suporte.
- Terminal integrado por projeto.
- Enviar logs do terminal para a IA analisar e corrigir.
- Memória local global e por projeto.
- Configurações de NVIDIA API: API key, base URL, modelo, temperatura, tokens e modo de resposta.
- Logo em SVG, PNG e ICO.
- Build para `.exe` Windows com `electron-builder`.
- Workflow GitHub Actions para gerar instalador Windows.

## Tecnologias

- Electron
- React
- TypeScript
- Vite
- NVIDIA API no formato OpenAI-compatible `/v1/chat/completions`
- electron-builder

## Como rodar no PC

Instale Node.js 22 ou mais novo.

```bash
npm install
npm run dev
```

## Configurar NVIDIA API

1. Abra o app.
2. Clique em **Configurações**.
3. Coloque sua API key NVIDIA.
4. Confirme a base URL:

```txt
https://integrate.api.nvidia.com/v1
```

5. Escolha o modelo.
6. Configure tokens se quiser:
   - **Resposta máx.**: tamanho máximo da resposta.
   - **Janela de contexto**: limite total de tokens do modelo.
   - **Reserva saída**: tokens guardados para a resposta.
7. Clique em **Testar API**.
8. Salve.

## Área Estudos

Use a aba **Estudos** para gerar material rápido:

- Escolha a matéria.
- Escolha objetivo: prova, trabalho, revisão rápida, aprender do zero ou programação prática.
- Informe tempo disponível.
- Cole o conteúdo da prova ou dúvida.
- Clique em:
  - **Plano rápido** para saber o que estudar primeiro.
  - **Resumo essencial** para revisão.
  - **Quiz** para treinar.
  - **Mini simulado** para testar se aprendeu.

## Fontes e citações

O Nemotron usa fontes de três formas:

1. Arquivos anexados no chat.
2. Imagens anexadas no chat.
3. Links colados na mensagem.

Quando o link puder ser lido, o app envia o texto para a IA e pede citação no formato:

```txt
[Fonte 1: nome da fonte]
```

Se a fonte não puder ser lida, a IA é instruída a não inventar informação.

## Gerar instalador `.exe`

No Windows:

```bash
npm install
npm run dist
```

O instalador será criado em:

```txt
release/Nemotron-Setup-1.1.0.exe
```

## Gerar versão portátil `.exe`

```bash
npm run dist:portable
```

## Gerar pelo GitHub Actions

1. Suba este projeto para o GitHub.
2. Vá em **Actions**.
3. Rode o workflow **Build Windows EXE**.
4. Baixe o artifact gerado.

## Como usar como Coding Agent

1. Clique em **Selecionar pasta**.
2. Escolha a pasta do projeto.
3. Abra arquivos no painel **Projeto**.
4. Use **Analisar projeto** para enviar a árvore de arquivos para IA.
5. Use o terminal para rodar build/testes.
6. Clique em **Enviar erro para IA** quando houver erro.
7. Aplique correções manualmente ou salve um Artifact direto no projeto.

## Segurança

- O app cria backup antes de sobrescrever ou excluir arquivos.
- Comandos destrutivos comuns são bloqueados por padrão.
- Exclusão de arquivo pede confirmação.
- O app não modifica arquivos sozinho sem ação do usuário.

## Limitações atuais

- PDF/DOCX não são extraídos diretamente nesta versão. Para esses formatos, converta para texto ou cole o conteúdo.
- O suporte a imagem depende do modelo NVIDIA usado aceitar entrada visual.
- Links podem falhar por bloqueio de site, login, Cloudflare, CORS/anti-bot ou ausência de internet.
- Não há conectores de Google Drive/Gmail/Slack nesta versão. O foco é desktop local + projetos + arquivos + terminal.

## Build testado

O comando abaixo foi testado e passou:

```bash
npm run build
```

A geração do `.exe` depende de internet para o `electron-builder` baixar componentes do GitHub. Neste ambiente, a tentativa de gerar portable falhou por falta de acesso a `github.com`. No seu PC ou GitHub Actions, com internet, o build do `.exe` deve seguir normalmente.

## Estrutura

```txt
nemotron-desktop/
  electron/
    main.cjs
    preload.cjs
  public/assets/
    nemotron.svg
    nemotron.png
    nemotron.ico
  src/
    components/
      StudyPanel.tsx
    services/
      promptBuilder.ts
      sources.ts
      tokenizer.ts
    styles/
    types/
    App.tsx
    main.tsx
  .github/workflows/windows-exe.yml
  package.json
```

## Correção para erro `npm error Exit handler never called`

Esse erro é do próprio npm, não do Nemotron. Esta versão remove o `package-lock.json` gerado em ambiente externo e fixa versões públicas no `package.json`.

No PowerShell, rode:

```powershell
cd "C:\Projetos\nemotron-app"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm cache clean --force
npm install --no-audit --no-fund --legacy-peer-deps
```

Se ainda der erro, use uma versão estável do npm:

```powershell
npm install -g npm@10
npm -v
npm install --no-audit --no-fund --legacy-peer-deps
```

Evite instalar dentro do OneDrive. Prefira uma pasta simples, por exemplo:

```powershell
C:\Projetos\nemotron-app
```


## Correção npm ETARGET

Se aparecer:

```txt
npm error code ETARGET
npm error notarget No matching version found for @types/react-dom@^19.2.9
```

Use esta versão 1.1.3. O erro foi causado por uma versão inexistente em `package.json`.
A dependência correta foi travada em:

```json
"@types/react-dom": "19.2.3"
```

Depois rode:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm cache clean --force
npm install --no-audit --no-fund --legacy-peer-deps
```
