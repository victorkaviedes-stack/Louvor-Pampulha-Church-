/* ============================================================
   ARQUIVO DE CONFIGURAÇÃO
   ============================================================ */

// Senha de acesso da equipe de louvor.
// Aviso: isso NÃO é segurança de verdade, é só uma barreira contra acesso
// casual. Qualquer pessoa que abrir o código-fonte da página consegue ler
// esta senha.
const APP_PASSWORD = "pampulha2026";

const CHURCH_NAME = "Igreja Pampulha";
const MINISTRY_NAME = "Ministério de Louvor";

// Categorias usadas para filtrar o repertório.
const CATEGORIES = ["Adoração", "Celebração", "Ceia", "Instrumental", "Ofertório"];

/* ------------------------------------------------------------
   INTEGRAÇÃO COM GOOGLE DRIVE — fonte real das cifras
   ------------------------------------------------------------
   O repertório vem de uma pasta do Google Drive: uma subpasta por
   artista, e dentro dela um Google Doc por música. Qualquer pessoa
   com acesso de edição naquela pasta pode criar ou alterar uma
   cifra direto pelo Google Docs, e o app busca a versão mais
   recente toda vez que é aberto (ou quando aperta "Atualizar").

   Passo a passo para deixar isso funcionando (feito uma vez só):

   1) No Google Cloud Console (console.cloud.google.com), crie um
      projeto (ou use um existente), ative a "Google Drive API" e
      crie uma credencial do tipo "Chave de API".
      Restrinja essa chave por segurança:
        - "Restrições de API" → Google Drive API
        - "Restrições de aplicativo" → Sites da Web (referenciadores
          HTTP) → adicione o endereço onde o app vai ficar hospedado,
          ex: https://seuusuario.github.io/*
          (e http://localhost:8080/* se quiser testar localmente)
      Isso importa porque essa chave fica visível no código-fonte da
      página; é assim que toda integração client-side com Google
      funciona. A restrição por site impede que outra pessoa use a
      mesma chave em outro lugar.

   2) Na pasta raiz do Drive, clique em Compartilhar → Acesso geral →
      "Qualquer pessoa com o link" → papel "Leitor". Isso vale também
      para as subpastas de artista e os documentos dentro delas,
      inclusive os criados depois. Aviso: com isso, qualquer pessoa
      que descobrir o link direto de um Documento consegue abrir o
      conteúdo mesmo sem passar pela senha do app. A senha continua
      protegendo a entrada no app; não protege os Documentos em si.

   3) Cole o ID da pasta raiz e a chave abaixo.

   4) Em cada Google Doc (uma música = um documento), o nome do
      arquivo vira o título e o nome da pasta vira o artista. O
      conteúdo do documento pode começar com linhas de metadado
      opcionais, antes da cifra em si:

        Tom: G
        Categoria: Adoração, Celebração
        YouTube: https://youtu.be/xxxxxxxx

      Tom, Categoria e YouTube são opcionais; o que não for
      informado fica em branco. O resto do texto pode ser escrito
      do jeito comum (linha de acordes em cima, linha de letra
      embaixo) ou já com colchetes; o app converte sozinho, é a
      mesma lógica da aba Converter.
   ------------------------------------------------------------ */

const DRIVE_ENABLED = true;
const DRIVE_FOLDER_ID = "1Es91NiCuek-Lig-nAno502K__ehG4Jn2";
const DRIVE_API_KEY = "COLE_AQUI_SUA_CHAVE_DE_API_DO_GOOGLE_DRIVE";

/* ------------------------------------------------------------
   REPERTÓRIO DE EMERGÊNCIA
   Usado só como exemplo e rede de segurança: se o Drive ainda não
   estiver configurado, se a chave estiver errada, ou se não houver
   internet, o app cai para isto em vez de ficar vazio. Não precisa
   manter atualizado depois que o Drive estiver funcionando.
   ------------------------------------------------------------ */

const SONGS = [
  {
    title: "Grande é o Senhor",
    artist: "Exemplo (configure o Drive acima)",
    tom: "G",
    tags: ["Adoração"],
    youtubeId: "",
    cifra: `## Verso 1
[G]Grande é o [C]Senhor e [D]digno de [G]louvor`
  }
];

/* ------------------------------------------------------------
   ESCALAS — em construção.
   Formato pensado para quando essa aba for ligada de verdade:

   const SCHEDULE = [
     {
       date: "2026-07-12",
       service: "Culto de Celebração",
       team: [
         { role: "Vocal", name: "Cris" },
         { role: "Teclado", name: "Victor" }
       ]
     },
   ];
   ------------------------------------------------------------ */
const SCHEDULE = [];
