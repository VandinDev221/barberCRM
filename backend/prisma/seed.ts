async function main() {
  console.log('Seed de produção: nenhum usuário ou dado demo criado.');
  console.log('Crie sua conta em /register e assine em /billing.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
