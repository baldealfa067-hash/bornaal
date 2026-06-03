## Corrigir botão "Registar como prestador"

O botão outline no hero da landing page tem mau contraste — o texto fica difícil de ler sobre o fundo da imagem e ao passar o rato fica branco no branco.

### Alteração

Em `src/pages/Landing.tsx`, atualizar as classes do botão "Registar como prestador":

- Fundo semi-transparente sempre visível (`bg-white/10 backdrop-blur-sm`)
- Borda mais visível (`border-white/40` em vez de `border-white/20`)
- Texto branco sempre legível
- No hover: fundo branco com texto escuro (`hover:bg-white hover:text-foreground`) para garantir contraste

Nenhuma outra alteração — apenas as classes deste botão.
