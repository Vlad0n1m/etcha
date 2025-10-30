import { PrismaClient } from "../src/generated/prisma/index.js"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Seeding database...")

    // Seed categories
    const categories = [
        { name: "🎵 Music", value: "music", icon: "🎵" },
        { name: "🎨 Art", value: "art", icon: "🎨" },
        { name: "🔗 Blockchain", value: "blockchain", icon: "🔗" },
        { name: "🏀 Sports", value: "sports", icon: "🏀" },
        { name: "🎭 Theater", value: "theater", icon: "🎭" },
        { name: "💼 Business", value: "business", icon: "💼" },
        { name: "🎓 Education", value: "education", icon: "🎓" },
        { name: "🎮 Gaming", value: "gaming", icon: "🎮" },
    ]

    for (const category of categories) {
        await prisma.category.upsert({
            where: { value: category.value },
            update: {},
            create: category,
        })
    }

    console.log("✅ Categories seeded successfully")

    console.log("🎉 Database seeding completed!")
}

main()
    .catch((e) => {
        console.error("❌ Error seeding database:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

