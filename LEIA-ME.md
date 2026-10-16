# Cronómetro + Ranking — instalação

## Ficheiros
| Ficheiro | Função |
|---|---|
| `operador.html` | Telemóvel do operador: 2 cronómetros (Pista A / Pista B), mm:ss.mmm |
| `index.html` | Ranking público em tempo real (melhor tempo de cada atleta) |
| `config.js` | Onde colas o URL e a chave do Supabase |
| `comum.js` | Funções partilhadas (não é preciso mexer) |
| `supabase.sql` | Cria a base de dados, o PIN e as permissões |

## Testar já (sem configurar nada)
Abre `operador.html` e `index.html` no mesmo browser. Com o `config.js` vazio corre em **modo demo**: os tempos ficam só nesse browser, mas dá para testar tudo.

## Pôr a funcionar a sério (≈ 10 min)
1. **Supabase** → New project.
2. **SQL Editor** → cola todo o `supabase.sql` → *Run*.
3. Muda o PIN (por omissão é `1234`):
   `update public.config_privada set valor = 'O_TEU_PIN' where chave = 'pin_operador';`
4. **Project Settings → API**: copia o *Project URL* e a chave *anon public* para o `config.js`.
5. **Vercel** → Add New Project → faz upload da pasta (ou via GitHub). Não precisa de build.

Links finais:
- Ranking: `https://o-teu-site.vercel.app/`
- Operador: `https://o-teu-site.vercel.app/operador.html`

## Várias provas
Acrescenta `?prova=` ao link, no operador e no ranking:
`operador.html?prova=Pista%20Obstaculos` → `index.html?prova=Pista%20Obstaculos`
Cada prova tem o seu ranking separado.

## Como usar no terreno
- Escreve o nome na pista (pode ser antes ou depois de correr).
- **INICIAR** → **PARAR** → **GUARDAR** (ou *Descartar*).
- O cronómetro reage ao toque, não ao soltar o dedo, para ganhar precisão.
- Se o ecrã bloquear ou a página recarregar, o tempo em curso não se perde.
- Sem rede: os tempos ficam em fila ("● 2 por enviar") e seguem quando a rede voltar.
- **Registos**: mostra os últimos tempos e permite apagar um engano.
- No ranking, o mesmo nome escrito com/sem acentos ou maiúsculas conta como o mesmo atleta.
