import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
    const adminEmail = process.env.ADMIN_EMAIL ?? "admin@nilo.com";
    const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123!";

    // Admin user
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
        where: { email: adminEmail },
        update: { role: "ADMIN" },
        create: {
            email: adminEmail,
            passwordHash,
            name: "Admin Nilo",
            role: "ADMIN",
        },
    });

    // Categories
    const categories = [
        { name: "Figuras", slug: "figuras" },
        { name: "Repuestos", slug: "repuestos" },
        { name: "Hogar", slug: "hogar" },
    ]

    const createdCategories = [];
    for (const category of categories) {
        const createdCategory = await prisma.category.upsert({
            where: { slug: category.slug },
            update: { name: category.name },
            create: category,
        });
        createdCategories.push(createdCategory);
    }

    // Products
    const products = [
        {
            name: "Soporte de Auriculares Minimal",
            slug: "soporte-auriculares-minimal",
            description: "Soporte resistente para escritorio, ideal para PLA/PETG.",
            basePrice: "4500.00",
            categorySlug: "hogar",
            images: [{ url: "https://picsum.photos/seed/nilo1/800/600", alt: "Soporte auriculares", position: 0 }],
            options: [
                { material: "PLA", color: "Negro", quality: "STANDARD", priceDelta: "0.00" },
                { material: "PETG", color: "Negro", quality: "STANDARD", priceDelta: "1200.00" },
                { material: "PLA", color: "Blanco", quality: "HIGH", priceDelta: "800.00" },
            ],
        },
        {
            name: "Organizador de Cables",
            slug: "organizador-de-cables",
            description: "Clips para ordenar cables en escritorio o pared.",
            basePrice: "1800.00",
            categorySlug: "hogar",
            images: [{ url: "https://picsum.photos/seed/nilo2/800/600", alt: "Organizador cables", position: 0 }],
            options: [
                { material: "PLA", color: "Gris", quality: "DRAFT", priceDelta: "-300.00" },
                { material: "PLA", color: "Negro", quality: "STANDARD", priceDelta: "0.00" },
            ],
        },
        {
            name: "Figura Low-Poly Zorro",
            slug: "figura-low-poly-zorro",
            description: "Decoración low-poly, queda genial en calidad HIGH.",
            basePrice: "5200.00",
            categorySlug: "figuras",
            images: [{ url: "https://picsum.photos/seed/nilo3/800/600", alt: "Zorro low-poly", position: 0 }],
            options: [
                { material: "PLA", color: "Naranja", quality: "STANDARD", priceDelta: "0.00" },
                { material: "PLA", color: "Naranja", quality: "HIGH", priceDelta: "1000.00" },
            ],
        }
    ];

    // Completar hasta 12 productos con variaciones
    while (products.length < 12) {
        const index = products.length + 1;
        products.push({
            name: `Producto ${index}`,
            slug: `producto-${index}`,
            description: `Descripción del producto ${index}`,
            basePrice: (2000 + index * 150).toFixed(2),
            categorySlug: index % 2 === 0 ? "repuestos" : "figuras",
            images: [{ url: `https://picsum.photos/seed/nilo${10 +index}/800/600`, alt: `Producto ${index}`, position: 0 }],
            options: [
               { material: "PLA", color: "Negro", quality: "STANDARD", priceDelta: "0.00" },
                { material: "PLA", color: "Blanco", quality: "STANDARD", priceDelta: "0.00" },
                { material: "PETG", color: "Negro", quality: "HIGH", priceDelta: "900.00" },
            ],
        });
    }

    for (const product of products) {
        const category = createdCategories.find((c) => c.slug === product.categorySlug)!;

        await prisma.product.upsert({
            where: { slug: product.slug },
            update: {
                name: product.name,
                description: product.description,
                basePrice: product.basePrice,
                active: true,
                categoryId: category.id,
            },
            create: {
                name: product.name,
                slug: product.slug,
                description: product.description,
                basePrice: product.basePrice,
                active: true,
                categoryId: category.id,
                images: { create: product.images },
                options: { create: product.options },
            },
        });
    }

    console.log("Seed completado exitosamente.");

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
    await prisma.$disconnect();
    });