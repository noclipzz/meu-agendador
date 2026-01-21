const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // 1. Limpa o banco (apaga dados antigos para não duplicar se rodar 2x)
  await prisma.booking.deleteMany()
  await prisma.service.deleteMany()
  await prisma.company.deleteMany()

  console.log('🧹 Banco limpo...')

  // 2. Cria a Empresa Exemplo
  const barbearia = await prisma.company.create({
    data: {
      name: 'Barbearia do Mestre',
      slug: 'barbearia-mestre', // Esse será o link: app.com/barbearia-mestre
      services: {
        create: [
          {
            name: 'Corte Degrade',
            description: 'Corte moderno com máquina e tesoura',
            price: 45.00,
            duration: 45 // minutos
          },
          {
            name: 'Barba Terapia',
            description: 'Barba completa com toalha quente',
            price: 35.00,
            duration: 30 // minutos
          },
          {
            name: 'Combo (Corte + Barba)',
            description: 'O pacote completo',
            price: 70.00,
            duration: 60 // minutos
          }
        ]
      }
    }
  })

  console.log(`✅ Empresa criada: ${barbearia.name}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })