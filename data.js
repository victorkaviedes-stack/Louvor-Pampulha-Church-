/* ============================================================
   ARQUIVO DE CONTEÚDO — é aqui que você mexe no dia a dia.
   Não precisa tocar em index.html, style.css ou app.js.
   ============================================================ */

// Senha de acesso da equipe de louvor.
// Aviso importante: isso NÃO é segurança de verdade. Qualquer pessoa que
// abrir o código-fonte da página (F12 no navegador) consegue ler esta senha
// e o conteúdo completo, com ou sem ela. Serve só para afastar acesso casual
// de quem não é da equipe, não para proteger informação sigilosa. Se um dia
// precisar de controle de acesso real (por pessoa, com log de quem entrou),
// aí sim vale migrar para login com Firebase, como você já fez nos outros apps.
const APP_PASSWORD = "pampulha2026";

const CHURCH_NAME = "Igreja Pampulha";
const MINISTRY_NAME = "Ministério de Louvor";

// Categorias usadas para filtrar o repertório. Adicione/remova livremente;
// elas aparecem como chips de filtro na tela inicial.
const CATEGORIES = ["Adoração", "Celebração", "Ceia", "Instrumental", "Ofertório"];

/* ------------------------------------------------------------
   REPERTÓRIO
   Cada música é um objeto no array SONGS abaixo. Campos:

   title      → nome da música
   artist     → autor/intérprete de referência
   tom        → tom original (ex: "C", "G", "D", "Eb")
   tags       → array com uma ou mais categorias de CATEGORIES
   youtubeId  → o código depois de "v=" no link do YouTube
                (ex: em youtube.com/watch?v=ABC123 o id é "ABC123")
   cifra      → o texto da cifra. Formato:
                - linha começando com "## " vira um cabeçalho de seção
                  (## Introdução, ## Verso 1, ## Refrão, ## Ponte...)
                - acordes ficam entre colchetes colados à sílaba onde caem:
                  "[C]Grande é o [G]Senhor e [Am]digno de [F]louvor"
                - linha em branco vira um espaço entre blocos

   Para adicionar uma música nova, copie um objeto inteiro (do { até o },
   incluindo a vírgula depois) e cole antes do "];" no final, ajustando os
   campos.
   ------------------------------------------------------------ */

const SONGS = [
  {
    title: "Grande é o Senhor",
    artist: "Adoração e Adoradores",
    tom: "G",
    tags: ["Adoração"],
    youtubeId: "dQw4w9WgXcQ",
    cifra: `## Introdução
[G] [C] [D] [G]

## Verso 1
[G]Grande é o [C]Senhor e [D]digno de [G]louvor
[Em]Na cidade do nosso [C]Deus, no seu [D]monte santo

## Refrão
[C]Grande é o [G]Senhor
[C]Digno é o [D]Senhor
[Em]Toda honra e [C]toda glória a [D]Ele`
  },
  {
    title: "Ceia",
    artist: "Ministério Pampulha",
    tom: "D",
    tags: ["Ceia"],
    youtubeId: "dQw4w9WgXcQ",
    cifra: `## Verso 1
[D]Este é o meu [G]corpo
[D]Partido por [A]você
[Bm]Este é o meu [G]sangue
[A]Derramado em a[D]mor

## Refrão
[G]Comei e be[D]bei
[Bm]Em memória de [A]mim`
  },
  {
    title: "Ofertório Instrumental",
    artist: "Instrumental",
    tom: "C",
    tags: ["Instrumental", "Ofertório"],
    youtubeId: "dQw4w9WgXcQ",
    cifra: `## Tema A
[C] [Am] [F] [G]
[C] [Am] [Dm] [G]

## Tema B (modulação sugerida +2)
[C] [G/B] [Am] [Em]
[F] [C/E] [Dm] [G]`
  }
];

/* ------------------------------------------------------------
   ESCALAS — em construção.
   Quando quiser ativar essa aba de verdade, o formato pensado é:

   const SCHEDULE = [
     {
       date: "2026-07-12",
       service: "Culto de Celebração",
       team: [
         { role: "Vocal", name: "Cris" },
         { role: "Teclado", name: "Victor" },
         { role: "Bateria", name: "..." }
       ]
     },
   ];

   Me avise quando quiser que eu construa a tela para isso; a estrutura
   de dados já está pronta para receber.
   ------------------------------------------------------------ */
const SCHEDULE = [];
